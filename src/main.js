const myScreen = document.querySelector('#screen')

let currentNote, currentOctave, currentNoteInfo = null, shouldPlay = false,
    audioCtx = new AudioContext(), analyser = audioCtx.createAnalyser()

analyser.fftSize = 2048
const bufferLength = analyser.frequencyBinCount
const audioDataArray = new Uint8Array(bufferLength)
const barWidth = (myScreen || document.body)?.getClientRects()[0].width / bufferLength

const isKeyPressed = {}

const mapKeycodeToNote = {
  "KeyQ":         "C",
  "KeyW":         "C#/Db",
  "KeyE":         "D",
  "KeyR":         "D#/Eb",
  "KeyT":         "E",
  "KeyY":         "F",
  "KeyU":         "F#/Gb",
  "KeyI":         "G",
  "KeyO":         "G#/Ab",
  "KeyP":         "A",
  "BracketLeft":  "A#/Bb",
  "BracketRight": "B",
}

const mapKeycodeToOctave = {
  "Digit1": "0",
  "Digit2": "1",
  "Digit3": "2",
  "Digit4": "3",
  "Digit5": "4",
  "Digit6": "5",
}

const mapNoteToFrequency = {
  "C0": 16.35,      "C#0/Db0": 17.32, "D0": 18.35,      "D#0/Eb0": 19.45, "E0": 20.60,      "F0": 21.83,  
  "F#0/Gb0": 23.12, "G0": 24.50,      "G#0/Ab0": 25.96, "A0": 27.50,      "A#0/Bb0": 29.14, "B0": 30.87,

  "C1": 32.70,      "C#1/Db1": 34.65, "D1": 36.71,      "D#1/Eb1": 38.89, "E1": 41.20,      "F1": 43.65,  
  "F#1/Gb1": 46.25, "G1": 49,         "G#1/Ab1": 51.91, "A1": 55,         "A#1/Bb1": 58.27, "B1": 61.74,

  "C2": 65.41,      "C#2/Db2": 69.30, "D2": 73.42,       "D#2/Eb2": 77.78, "E2": 82.41,       "F2": 87.31,  
  "F#2/Gb2": 92.50, "G2": 98,         "G#2/Ab2": 103.83, "A2": 110,        "A#2/Bb2": 116.54, "B2": 123.47,

  "C3": 130.81,   "C#3/Db3": 138.59, "D3": 146.83,      "D#3/Eb3": 155.56, "E3": 164.81,      "F3": 174.61, 
  "F#3/Gb3": 185, "G3": 196,         "G#3/Ab3": 207.65, "A3": 220,         "A#3/Bb3": 233.08, "B3": 246.94,

  "C4": 261.63,      "C#4/Db4": 277.18, "D4": 293.66,      "D#4/Eb4": 311.13, "E4": 329.63,      "F4": 349.23, 
  "F#4/Gb4": 369.99, "G4": 392,         "G#4/Ab4": 415.30, "A4": 440,         "A#4/Bb4": 466.16, "B4": 493.88,

  "C5": 523.25,      "C#5/Db5": 554.37, "D5": 587.33,      "D#5/Eb5": 622.25, "E5": 659.25,      "F5": 698.46, 
  "F#5/Gb5": 739.99, "G5": 783.99,      "G#5/Ab5": 830.61, "A5": 880,         "A#5/Bb5": 932.33, "B5": 987.77,
}

function getNoteInfo(note = "", octave = "") {
  const pureNote = note

  if (note.match(/[#b]/g))
    note = note.replace(/[#b]/g, character => character + octave)
  else
    note = note + octave

  return {
    octave,
    noteName:     pureNote,
    noteFullName: note,
    frequency:    mapNoteToFrequency[note],
  }
}

function toneShift(frequency = 440, shift = 0) {
  return Math.pow(2, shift / 12) * frequency
}

let currentOscillators = []

function createOscillator() {
  const oscillator = {
    refresh() {
      let previousConfig = {}
      if (this.oscillatorNode) {
        previousConfig.type = this.oscillatorNode.type
        previousConfig.shift = this.shift
      }
      if (this.gainNode) {
        previousConfig.volume = this.gainNode.gain.value
      }

      this.oscillatorNode = audioCtx.createOscillator()
      this.setOscillatorType(previousConfig.type)
      if (!this.gainNode) {
        this.gainNode = audioCtx.createGain()
        this.setMasterVolume(previousConfig.volume)
      }
      this.setToneShift(previousConfig.shift)
      
      this.oscillatorNode.connect(this.gainNode)
      this.gainNode.connect(analyser)
      this.gainNode.connect(audioCtx.destination)
    },

    setMasterVolume(value = 0.5) {
      this.gainNode?.gain.setValueAtTime(value, audioCtx.currentTime)
    },

    setOscillatorType(value = 'sine') {
      this.oscillatorNode && (this.oscillatorNode.type = value)
    },

    setToneShift(value = 0) {
      this.shift = value
    },

    playCurrentNote() {
      if (!currentNoteInfo || !currentNoteInfo.frequency || this.isPlaying) return

      this.refresh()
      this.oscillatorNode.frequency.setValueAtTime(
        toneShift(currentNoteInfo.frequency, this.shift), audioCtx.currentTime
      )
      ;(this.oscillatorNode.start(), this.isPlaying = true)
    },
  
    stopCurrentNote() {
      if (!this.isPlaying) return
      ;(this.oscillatorNode.stop(), this.isPlaying = false)
    },
  }

  oscillator.refresh()
  return oscillator
}

const visualizer = document.createElement('canvas')
visualizer.id = 'visualizer'
visualizer.height = 256
visualizer.clear = function() {
  this.context?.clearRect(0, 0, this.rects?.width, this.rects?.height)
}
visualizer.drawData = function(audioDataArray) {
  if (!this.context) {
    this.context = this.getContext('2d')
    this.context.fillStyle = 'firebrick'
  }
  if (!this.rects) this.rects = this.getClientRects()[0]

  this.clear()
  audioDataArray.forEach(
    (item, index) => this.context?.fillRect(
      index * barWidth, item, barWidth, 2,
    )
  )
}

const noteInfoDisplay = document.createElement('div')
noteInfoDisplay.id = 'note-info'
noteInfoDisplay.update = function({ noteName, octave = "", frequency = 0} = {}) {
  this.innerHTML = /*html*/`
    <span class="octave">${octave}</span>
    <span class="note">${noteName || "--"}</span>
    <span class="frequency">${frequency ? `${frequency}Hz`: "--"}</span>
  `
}
noteInfoDisplay.update()

const oscillatorsList = document.createElement('ul')
oscillatorsList.id = 'oscillators-list'
oscillatorsList.innerHTML = /*html*/`
  <button class="add">+</button>
  <span class="label">Oscillators: 0</span>
`
oscillatorsList.addOscillator = function() {
  const oscillator = createOscillator()

  currentOscillators.push(oscillator)
  oscillator.id = currentOscillators.length

  const li = document.createElement('li')
  li.classList.add('oscillator')
  li.innerHTML = /*html*/`
    <span class="title">Oscillator #${oscillator.id}</span>

    <fieldset class="control master-volume-control">
      <legend>Master Volume</legend>
      <input type="range" min="0" max="100" step="1">
    </fieldset>

    <fieldset class="control waveform-control">
      <legend>Waveform</legend>
      <label for="sine">
        <input type="radio" id="sine" name="waveform-${oscillator.id}" value="sine" checked> Sine
      </label>
      <label for="triangle">
        <input type="radio" id="triangle" name="waveform-${oscillator.id}" value="triangle"> Triangle
      </label>
      <label for="sawtooth">
        <input type="radio" id="sawtooth" name="waveform-${oscillator.id}" value="sawtooth"> Sawtooth
      </label>
      <label for="square">
        <input type="radio" id="square" name="waveform-${oscillator.id}" value="square"> Square
      </label>
    </fieldset>

    <fieldset class="control tone-control">
      <legend>Tone Shift</legend>
      <input type="range" min="-12" max="12" step="1">
    </fieldset>

    <fieldset class="control adsr-control">
      <legend>ADSR</legend>
      <label for="attack">
        <span>Attack</span> <input type="range" id="attack" min="-10" max="10" step="0.5">
      </label>
      <label for="decay">
        <span>Decay</span> <input type="range" id="decay" min="-10" max="10" step="0.5">
      </label>
      <label for="sustain">
        <span>Sustain</span> <input type="range" id="sustain" min="-10" max="10" step="0.5">
      </label>
      <label for="release">
        <span>Release</span> <input type="range" id="release" min="-10" max="10" step="0.5">
      </label>
    </fieldset>

    <fieldset class="control eq-control">
      <legend>Equalization</legend>
      <label for="bass">
        <span>Bass</span> <input type="range" id="bass" min="-10" max="10" step="0.5">
      </label>
      <label for="mid">
        <span>Mid</span> <input type="range" id="mid" min="-10" max="10" step="0.5">
      </label>
      <label for="treble">
        <span>Treble</span> <input type="range" id="treble" min="-10" max="10" step="0.5">
      </label>
    </fieldset>
  `
  li.querySelector('.master-volume-control input').addEventListener('input', ({ target }) =>
    oscillator.setMasterVolume(parseInt(target.value) / 100)
  )
  li.querySelector('.tone-control input').addEventListener('input', ({ target }) =>
    oscillator.setToneShift(parseInt(target.value))
  )
  li.querySelectorAll('.waveform-control input').forEach(input => 
    input.addEventListener('change', ({ target }) =>
      oscillator.setOscillatorType(target.value)
    )
  )

  this.appendChild(li)
  this.querySelector('.label').innerText = `Oscillators: ${currentOscillators.length}`
}
oscillatorsList.querySelector(".add").addEventListener('click', _ => {
  oscillatorsList.addOscillator()
})

window.addEventListener('keydown', event => {
  if (isKeyPressed[event.code]) return
  isKeyPressed[event.code] = true

  if (mapKeycodeToNote[event.code])
    currentNote = mapKeycodeToNote[event.code]
  if (mapKeycodeToOctave[event.code])
    currentOctave = mapKeycodeToOctave[event.code]

  const noteInfo = getNoteInfo(currentNote, currentOctave)
  noteInfoDisplay.update(noteInfo)

  noteInfo.frequency ? (currentNoteInfo = noteInfo) : (currentNoteInfo = null)
  if (Object.keys(mapKeycodeToNote).includes(event.code)) {
    noteInfo.frequency ?
    (shouldPlay = true) :
    (shouldPlay = false)
  }
})
window.addEventListener('keyup', event => {
  isKeyPressed[event.code] = false

  const possibleNotes = Object.keys(mapKeycodeToNote)
  if (
    possibleNotes.includes(event.code) &&
    Object.entries(isKeyPressed)
          .filter(([ _, value ]) => value)
          .every(([ key, _ ]) => !possibleNotes.includes(key))
  )
    (shouldPlay = false, currentNoteInfo = null)
})

let soundOn
function animationLoop() {
  if (shouldPlay) {
    noteInfoDisplay.classList.add('playing')
    if (!soundOn)
      (soundOn = true, currentOscillators.forEach(oscillator => oscillator.playCurrentNote()))

    analyser.getByteTimeDomainData(audioDataArray)
    visualizer.drawData(audioDataArray)
  }
  else {
    noteInfoDisplay.classList.remove('playing')
    if (soundOn)
      (soundOn = false, currentOscillators.forEach(oscillator => oscillator.stopCurrentNote()))

    visualizer.clear()
  }

  requestAnimationFrame(animationLoop)
}

myScreen.appendChild(visualizer)
myScreen.appendChild(noteInfoDisplay)
myScreen.appendChild(oscillatorsList)

animationLoop()
