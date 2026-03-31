import { execFile } from 'child_process'
import { app } from 'electron'
import fs from 'fs'
import icojs from 'icojs'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

let iconsDir = ''
let tempDir = ''

const RT_ICON = 3
const RT_GROUP_ICON = 14

export function iconFilePath(exePath: string): string | null {
  if (!iconsDir) return null
  const hash = Buffer.from(exePath.toLowerCase()).toString('hex').slice(0, 32)
  return path.join(iconsDir, `${hash}.png`)
}

export function initIconPaths(icons: string, temp: string): void {
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

export async function extractIconFromExe(exePath: string): Promise<Buffer | null> {
  /* pe-library pode vir undefined se o bundler não o externalizou corretamente */
  let NtExecutable: any
  let NtExecutableResource: any

  try {
    const peLib = await import('pe-library')
    NtExecutable = peLib.NtExecutable
    NtExecutableResource = peLib.NtExecutableResource
  } catch {
    return null
  }

  if (!NtExecutable?.from || !NtExecutableResource?.from) return null

  try {
    const data = fs.readFileSync(exePath)

    const exe = NtExecutable.from(data, { ignoreCert: true })
    const res = NtExecutableResource.from(exe)

    const entries = res.entries
    const groups = entries.filter((e: any) => e.type === RT_GROUP_ICON)
    if (groups.length === 0) return null

    const group = groups[0]
    const groupData = Buffer.from(group.bin)
    const count = groupData.readUInt16LE(4)

    const images: Buffer[] = []

    for (let i = 0; i < count; i++) {
      const offset = 6 + i * 14

      const width = groupData.readUInt8(offset) || 256
      const height = groupData.readUInt8(offset + 1) || 256
      const id = groupData.readUInt16LE(offset + 12)

      const iconEntry = entries.find((e: any) => e.type === RT_ICON && e.id === id)
      if (!iconEntry) continue

      const img = Buffer.from(iconEntry.bin)

      images.push(
        Buffer.concat([
          Buffer.from([width === 256 ? 0 : width, height === 256 ? 0 : height, 0, 0, 1, 0, 32, 0]),
          Buffer.alloc(4),
          Buffer.alloc(4),
          img
        ])
      )
    }

    if (!images.length) return null

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

    /* icojs também pode falhar em ICOs malformados */
    let parsed: any[]
    try {
      parsed = await icojs.parseICO(icoBuffer, 'image/png')
    } catch {
      return null
    }

    if (!parsed.length) return null

    const best = parsed.sort((a: any, b: any) => b.width - a.width)[0]
    if (!best?.buffer || best.width < 64) return null

    return Buffer.from(best.buffer)
  } catch {
    return null
  }
}

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
    int[] sizes = new int[] { 256, 128, 96, 64, 48, 32, 24, 16 };
    Bitmap bestIcon = null;
    int bestSize = 0;

    foreach (int size in sizes) {
      IntPtr[] hIcons = new IntPtr[1];
      int[] ids = new int[1];
      int count = PrivateExtractIcons(path, 0, size, size, hIcons, ids, 1, 0);

      if (count > 0 && hIcons[0] != IntPtr.Zero) {
        using (Icon ico = Icon.FromHandle(hIcons[0])) {
          Bitmap bmp = new Bitmap(ico.ToBitmap());
          DestroyIcon(hIcons[0]);

          if (bmp.Width == size && size > bestSize) {
            bestIcon?.Dispose();
            bestIcon = bmp;
            bestSize = size;
          } else {
            bmp.Dispose();
          }
        }
      }
    }

    if (bestIcon == null) {
      Icon ico = System.Drawing.Icon.ExtractAssociatedIcon(path);
      if (ico != null) {
        bestIcon = new Bitmap(ico.ToBitmap());
      }
    }

    return bestIcon;
  }
}
"@

try {
  $bmp = [IconExtractor]::GetBestQualityIcon("${exeEscaped}")
  if ($bmp -eq $null) { exit 1 }

  if ($bmp.Width -ge 128 -and $bmp.Width -lt 256) {
    $big = New-Object System.Drawing.Bitmap(256, 256)
    $g   = [System.Drawing.Graphics]::FromImage($big)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($bmp, 0, 0, 256, 256)
    $g.Dispose()
    $bmp.Dispose()
    $bmp = $big
  }

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
    for (const p of [scriptPath, outPath]) {
      try {
        fs.unlinkSync(p)
      } catch {
        /* ignore */
      }
    }
  }
}

export async function extractIcon(exePath: string): Promise<string | null> {
  const cached = getCachedIcon(exePath)
  if (cached) return cached

  const icoBuf = await extractIconFromExe(exePath)
  if (icoBuf) return saveIconCache(exePath, icoBuf)

  const psBuf = await extractIconPowerShell(exePath)
  if (psBuf) return saveIconCache(exePath, psBuf)

  const nativeBuf = await extractIconNative(exePath)
  if (nativeBuf) return saveIconCache(exePath, nativeBuf)

  return null
}

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
