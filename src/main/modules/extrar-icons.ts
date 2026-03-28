import { execFile } from 'child_process'
import { app } from 'electron'
import fs from 'fs'
import icojs from 'icojs'
import path from 'path'
import { NtExecutable, NtExecutableResource } from 'pe-library'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let iconsDir = ''
let tempDir = ''

// ── Icon cache helpers

export function iconFilePath(exePath: string): string | null {
  if (!iconsDir) return null
  const hash = Buffer.from(exePath.toLowerCase()).toString('hex').slice(0, 32)
  return path.join(iconsDir, `${hash}.png`)
}

export function initIconPaths(icons: string, temp: string) {
  iconsDir = icons
  tempDir = temp
}

export function getCachedIcon(exePath: string, size?: number): string | null {
  if (!iconsDir) return null
  const sizeSuffix = size ? `_${size}` : ''
  const hash = Buffer.from(exePath.toLowerCase()).toString('hex').slice(0, 32)
  const p = path.join(iconsDir, `${hash}${sizeSuffix}.png`)
  if (!fs.existsSync(p)) return null
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
}

export function saveIconCache(exePath: string, pngBuffer: Buffer, size?: number): string {
  const sizeSuffix = size ? `_${size}` : ''
  const hash = Buffer.from(exePath.toLowerCase()).toString('hex').slice(0, 32)
  const p = path.join(iconsDir, `${hash}${sizeSuffix}.png`)
  fs.writeFileSync(p, pngBuffer)
  return `data:image/png;base64,${pngBuffer.toString('base64')}`
}

// Tipos de recurso do Windows
const RT_ICON = 3
const RT_GROUP_ICON = 14

export async function extractIconFromExe(exePath: string): Promise<Buffer | null> {
  try {
    const data = fs.readFileSync(exePath)

    const exe = NtExecutable.from(data, {
      ignoreCert: true
    })
    const res = NtExecutableResource.from(exe)

    const entries = res.entries

    // pega grupos de ícone
    const groups = entries.filter((e) => e.type === RT_GROUP_ICON)
    if (groups.length === 0) return null

    const group = groups[0] // pode melhorar depois escolhendo melhor

    const groupData = Buffer.from(group.bin)
    // parse manual do GROUP_ICON
    const count = groupData.readUInt16LE(4)

    const images: Buffer[] = []

    for (let i = 0; i < count; i++) {
      const offset = 6 + i * 14

      const width = groupData.readUInt8(offset) || 256
      const height = groupData.readUInt8(offset + 1) || 256
      // const size = groupData.readUInt32LE(offset + 8)
      const id = groupData.readUInt16LE(offset + 12)

      const iconEntry = entries.find((e) => e.type === RT_ICON && e.id === id)

      if (!iconEntry) continue

      const img = Buffer.from(iconEntry.bin)

      images.push(
        Buffer.concat([
          Buffer.from([width === 256 ? 0 : width, height === 256 ? 0 : height, 0, 0, 1, 0, 32, 0]),
          Buffer.alloc(4), // size placeholder
          Buffer.alloc(4), // offset placeholder
          img
        ])
      )
    }

    if (!images.length) return null

    // monta ICO manual
    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(images.length, 4)

    let offset = 6 + images.length * 16
    const dirEntries: Buffer[] = []
    const imageBuffers: Buffer[] = []

    for (const img of images) {
      const size = img.length - 16

      const entry = Buffer.from(img.slice(0, 16))
      entry.writeUInt32LE(size, 8)
      entry.writeUInt32LE(offset, 12)

      dirEntries.push(entry)
      imageBuffers.push(img.slice(16))

      offset += size
    }

    const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers])

    // 🔥 parse com icojs
    const parsed = await icojs.parseICO(icoBuffer, 'image/png')

    if (!parsed.length) return null

    const best = parsed.sort((a, b) => b.width - a.width)[0]

    if (best.width < 64) return null

    return Buffer.from(best.buffer)
  } catch (err) {
    console.log(err)
    return null
  }
}

// ── Strategy 1: Electron native getFileIcon ───────────────────────────────────
// "large" is the maximum valid size option (32×32 on Windows, best on others).

async function extractIconNative(exePath: string): Promise<Buffer | null> {
  try {
    const img = await app.getFileIcon(exePath, { size: 'normal' })
    if (img.isEmpty()) return null
    return img.toPNG()
  } catch {
    return null
  }
}

async function extractIconPowerShell(exePath: string): Promise<Buffer | null> {
  if (process.platform !== 'win32' || !tempDir) return null

  const scriptPath = path.join(tempDir, `exevault_icon_${process.pid}.ps1`)
  const outPath = path.join(tempDir, `exevault_icon_${process.pid}.png`)

  const exeEscaped = exePath.replace(/\\/g, '\\\\')
  const outEscaped = outPath.replace(/\\/g, '\\\\')

  const script = `
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;

public class IconExtractor {
  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  static extern int PrivateExtractIcons(
    string lpszFile, int nIconIndex, int cxIcon, int cyIcon,
    IntPtr[] phicon, int[] piconid, int nIcons, int flags);

  [DllImport("user32.dll")]
  static extern bool DestroyIcon(IntPtr hIcon);

  public static Bitmap GetBestQualityIcon(string path) {
    // Tenta extrair em diferentes tamanhos (maior qualidade possível)
    int[] sizes = new int[] { 256, 128, 96, 64, 48, 32, 24, 16 };
    Bitmap bestIcon = null;
    int bestSize = 0;

    foreach (int size in sizes) {
      IntPtr[] hIcons = new IntPtr[1];
      int[]    ids    = new int[1];
      int count = PrivateExtractIcons(path, 0, size, size, hIcons, ids, 1, 0);
      
      if (count > 0 && hIcons[0] != IntPtr.Zero) {
        using (Icon ico = Icon.FromHandle(hIcons[0])) {
          Bitmap bmp = $icon.Save($stream));
          DestroyIcon(hIcons[0]);
          
          // Se encontrou um ícone do tamanho solicitado
          if (bmp.Width == size) {
            if (size > bestSize) {
              bestIcon?.Dispose();
              bestIcon = bmp;
              bestSize = size;
            } else {
              bmp.Dispose();
            }
          } else {
            bmp.Dispose();
          }
        }
      }
    }

    // Se não encontrou nenhum ícone com PrivateExtractIcons
    if (bestIcon == null) {
      using (Icon ico = System.Drawing.Icon.ExtractAssociatedIcon(path)) {
        if (ico != null) {
          bestIcon = $icon.Save($stream));
          bestSize = bestIcon.Width;
        }
      }
    }

    return bestIcon;
  }
}
"@

try {
  $bmp = [IconExtractor]::GetBestQualityIcon("${exeEscaped}")

  if ($bmp -eq $null) {
    exit 1
  }

  # Se o ícone for menor que 256, upscale mantendo qualidade
  if ($bmp.Width -ge 128 -and $bmp.Width -lt 256) {
    $big = New-Object System.Drawing.Bitmap(256, 256)
    $g   = [System.Drawing.Graphics]::FromImage($big)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Usar antialiasing para melhor qualidade
    $g.DrawImage($bmp, 0, 0, 256, 256)
    $g.Dispose()
    $bmp.Dispose()
    $bmp = $big
  }

  # Salvar com alta qualidade PNG
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, 100L
  )
  $pngCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | 
    Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Png.Guid }
  
  $bmp.Save("${outEscaped}", $pngCodec, $encoderParams)
  $bmp.Dispose()
  exit 0
} catch { 
  exit 1 
}
`

  try {
    fs.writeFileSync(scriptPath, script, 'utf-8')
    await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, timeout: 15_000 }
    )
    if (!fs.existsSync(outPath)) return null
    return fs.readFileSync(outPath)
  } catch {
    return null
  } finally {
    try {
      fs.unlinkSync(scriptPath)
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(outPath)
    } catch {
      /* ignore */
    }
  }
}

// ── Full extraction pipeline ──────────────────────────────────────────────────
// 1. Cache hit  → instant (delete userData/icons/ to force re-extraction)
// 2. PowerShell → native largest icon via PrivateExtractIcons (Win32 API)
// 3. Native     → app.getFileIcon 'large' (cross-platform fallback)

export async function extractIcon(exePath: string): Promise<string | null> {
  const cached = getCachedIcon(exePath)
  if (cached) return cached

  // 🥇 Melhor método (sem perda)
  const icoBuf = await extractIconFromExe(exePath)
  if (icoBuf) return saveIconCache(exePath, icoBuf)

  // 🥈 PowerShell fallback
  const psBuf = await extractIconPowerShell(exePath)
  if (psBuf) return saveIconCache(exePath, psBuf)

  // 🥉 Electron fallback
  const nativeBuf = await extractIconNative(exePath)
  if (nativeBuf) return saveIconCache(exePath, nativeBuf)

  return null
}
// ── Product name from PE version info ────────────────────────────────────────

export async function readProductName(exePath: string): Promise<string> {
  if (process.platform !== 'win32' || !tempDir) return ''

  const scriptPath = path.join(tempDir, `exevault_name_${process.pid}.ps1`)
  const exeEscaped = exePath.replace(/\\/g, '\\\\')

  const script = `
try {
  $v = (Get-Item "${exeEscaped}").VersionInfo
  if ($v.ProductName     -and $v.ProductName.Trim())     { Write-Output $v.ProductName.Trim();     exit }
  if ($v.FileDescription -and $v.FileDescription.Trim()) { Write-Output $v.FileDescription.Trim(); exit }
} catch {}
`

  try {
    fs.writeFileSync(scriptPath, script, 'utf-8')
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, timeout: 5_000 }
    )
    return stdout.trim()
  } catch {
    return ''
  } finally {
    try {
      fs.unlinkSync(scriptPath)
    } catch {
      /* ignore */
    }
  }
}
