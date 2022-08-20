const myScreen = document.querySelector('#screen')

let mRec, lastRec, recording = false, playing = false

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

myScreen.appendChild(recBtn)
myScreen.appendChild(playBtn)
