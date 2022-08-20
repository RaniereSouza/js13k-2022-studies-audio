const myScreen = document.querySelector('#screen')

let mRec, lastRec, audioSrc, recording = false, playing = false,
    audioCtx = new AudioContext(), analyser = audioCtx.createAnalyser()

analyser.fftSize = 512
const bufferLength = analyser.frequencyBinCount
const audioDataArray = new Uint8Array(bufferLength)
const barWidth = (myScreen || document.body)?.getClientRects()[0].width / bufferLength

const recBtn = document.createElement('button')
recBtn.textContent = 'Capture Audio'
recBtn.addEventListener('click', _ => {
  if (!recording) {
    navigator.mediaDevices.getUserMedia({audio: true})
      .then(stream => {
        ;(recording = true, recBtn.textContent = 'Stop Recording')
   
        const chunks = []
        mRec = new MediaRecorder(stream)

        mRec.addEventListener('dataavailable', ({ data }) => chunks.push(data))
        mRec.addEventListener('stop', _ => {
          const blob = new Blob(chunks, {type: 'audio/mp3'})
          const url = URL.createObjectURL(blob)
   
          lastRec = new Audio(url)
          lastRec.addEventListener('ended', _ => 
            (playing = false, playBtn.textContent = 'Play Last Record')
          )

          audioSrc = audioCtx.createMediaElementSource(lastRec)
          audioSrc.connect(analyser)
          analyser.connect(audioCtx.destination) // <-- plays the stream on the current audio output
        })

        mRec.start()
      })
  }
  else {
    ;(recording = false, recBtn.textContent = 'Capture Audio')
    mRec?.stop()
  }
})

const playBtn = document.createElement('button')
playBtn.textContent = 'Play Last Record'
playBtn.addEventListener('click', _ => {
  if (!lastRec || recording) return

  if (!playing) {
    ;(playing = true, playBtn.textContent = 'Stop Playing')
    lastRec.play()
  }
  else {
    ;(playing = false, playBtn.textContent = 'Play Last Record')
    ;(lastRec.pause(), lastRec.currentTime = 0) // lastRec.stop()
  }
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
visualizer.clear = function() {
  this.querySelectorAll('.column').forEach(column => column.style.height = '0%')
}


function animationLoop() {
  if (playing) {
    analyser.getByteFrequencyData(audioDataArray)
    visualizer.drawData(audioDataArray)
  }
  else
    visualizer.clear()

  requestAnimationFrame(animationLoop)
}

myScreen.appendChild(recBtn)
myScreen.appendChild(playBtn)
myScreen.appendChild(visualizer)

animationLoop()
