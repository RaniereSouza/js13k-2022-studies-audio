const myScreen = document.querySelector('#screen')

let audioSrc, audioCtx = new AudioContext(), analyser = audioCtx.createAnalyser()

analyser.fftSize = 512
const bufferLength = analyser.frequencyBinCount
const audioDataArray = new Uint8Array(bufferLength)
const barWidth = (myScreen || document.body)?.getClientRects()[0].width / bufferLength

navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => {
    audioSrc = audioCtx.createMediaStreamSource(stream)
    audioSrc.connect(analyser)
    // analyser.connect(audioCtx.destination) // <-- plays the stream on the current audio output
  })

const visualizer = document.createElement('canvas')
visualizer.id = 'visualizer'
visualizer.drawData = function(audioDataArray) {
  if (!this.context) {
    this.context = this.getContext('2d')
    this.context.fillStyle = 'firebrick'
  }
  if (!this.rects) this.rects = this.getClientRects()[0]

  this.context?.clearRect(0, 0, this.rects?.width, this.rects?.height)
  audioDataArray.forEach(
    (item, index) => this.context?.fillRect(
      index * barWidth, item - 50, barWidth, 2,
    )
  )
}

function animationLoop() {
  if (audioSrc) {
    analyser.getByteTimeDomainData(audioDataArray)
    visualizer.drawData(audioDataArray)
  }

  requestAnimationFrame(animationLoop)
}

myScreen.appendChild(visualizer)

animationLoop()
