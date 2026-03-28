export class PerformanceMonitor {
  private metrics = {
    cpu: 0,
    memory: 0,
    fps: 0
  }

  startMonitoring() {
    // Verifica se está no renderer process de forma segura
    const isRenderer = typeof window !== 'undefined' && window !== null

    if (isRenderer) {
      this.startRendererMonitoring()
    } else {
      this.startMainMonitoring()
    }
  }

  private startRendererMonitoring() {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFPS = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        this.metrics.fps = frameCount
        frameCount = 0
        lastTime = now

        // Se FPS muito baixo em foreground, alertar
        if (this.metrics.fps < 30 && document.hasFocus()) {
          console.warn('Low FPS detected:', this.metrics.fps)
        }
      }
      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  private startMainMonitoring() {
    // Monitoramento no main process
    setInterval(() => {
      const memoryUsage = process.memoryUsage()
      console.log('Memory usage:', memoryUsage)
    }, 5000)
  }
}
