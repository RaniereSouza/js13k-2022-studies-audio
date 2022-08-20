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

const visualizer = document.createElement('div')
visualizer.id = 'visualizer'
visualizer.replaceChildren(...(() => {
  let col
  const columns = []
  for (let i = bufferLength / 2; i > 0; i--) {
    ;(col = document.createElement('div'), col.classList.add('column', `column-${i}`))
    columns.push(col)
  }
  return columns
})())
visualizer.drawData = function(audioDataArray) {
  let barHeight
  this.querySelectorAll('.column').forEach((column, index) => {
    barHeight = audioDataArray[index]
    column.style.height = `${(barHeight / 255) * 100}%`
  })
}

function animationLoop() {
  if (audioSrc) {
    analyser.getByteFrequencyData(audioDataArray)
    visualizer.drawData(audioDataArray)
  }

  requestAnimationFrame(animationLoop)
}

myScreen.appendChild(visualizer)

animationLoop()
