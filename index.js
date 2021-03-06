/* Constants */

var MAX_SETS = 99
var MAX_MINS = 59
var MAX_SECS = 59

/* Utility functions */

function zfill (val) {
  /* Padding one zero on the left to reach length 2. */
  if (Math.floor(val / 10) >= 1) {
    return val.toString()
  } else {
    return '0' + val.toString()
  }
}

/* Objects */

function TimingSpec (warmupSecs, highSecs, lowSecs, cooldownSecs, totalSets) {
  /* Constructor
   *
   * For *Secs arguments, they take either a string representation of "MM:SS",
   * or a number in seconds.
   *
   */
  try {
    this.warmupSecs = this.parseTime(warmupSecs)
    this.highSecs = this.parseTime(highSecs)
    this.lowSecs = this.parseTime(lowSecs)
    this.cooldownSecs = this.parseTime(cooldownSecs)
  } catch (e) {
    throw new Error('Unable to create TimingSpec: ' + e.message)
  }
  totalSets = parseInt(totalSets)
  if (isNaN(totalSets)) {
    throw new Error('Unable to create TimingSpec: Sets arg. is not a number.')
  } else if (totalSets > MAX_SETS) {
    throw new Error('Unable to create TimingSpec: Sets over ' + MAX_SETS + '.')
  } else if (totalSets < 1) {
    throw new Error('Unable to create TimingSpec: Sets cannot be less than 1.')
  } else {
    this.totalSets = totalSets
  }
}
TimingSpec.prototype.parseTime = function (strOrNumber) {
  /* UNBOUND METHOD
   *
   * Parse a string "MM:SS" into seconds. If it's number, check the value and
   * returns it directly.
   *
   * Return:
   *   Integer: Parsed time in seconds.
   *
   * Throws:
   *   - Invalid format
   *   - Minutes or seconds value exceed maximum (59)
   */
  if (typeof strOrNumber === 'string') {
    var tStr = strOrNumber
    var timeRe = /^[0-9]{1,2}:[0-9]{1,2}$/
    if (!timeRe.test(tStr)) {
      throw new Error('Invalid format.')
    } else {
      var mins = parseInt(tStr.split(':')[0])
      var secs = parseInt(tStr.split(':')[1])
      if (mins > MAX_MINS) {
        throw new Error('Minutes value exceed maximum value 59.')
      } else if (secs > MAX_SECS) {
        throw new Error('seconds value exceed maximum value 59.')
      } else {
        return mins * 60 + secs
      }
    }
  } else if (typeof strOrNumber === 'number') {
    var number = strOrNumber
    if (number <= (MAX_MINS * 60 + MAX_SECS)) {
      return number
    } else {
      throw new Error('Total seconds ' +
                      number.toString() +
                      ' exceed maximum ' +
                      (MAX_MINS * 60 + MAX_SECS))
    }
  }
}

function HiitTimer (tSpec, onIntervalChange, onCounterChange, onDoneSetsChange) {
  /* Constructor
   *
   * Takes a TimingSpec and three callback functions for state changes as arguments.
   *
   */

  // State enum
  this.IntervalState = {
    WARMUP: 'warm up',
    HIGH: 'high',
    LOW: 'low',
    COOLDOWN: 'cool down',
    DONE: 'done'
  }

  this.tSpec = Object.assign({}, tSpec)

  /* Setting up initial state */
  this.currentState = this.IntervalState.WARMUP
  this.counter = this.tSpec.warmupSecs
  // Counter for counting sets
  // Whenever a high interval is finished, it will be increased by 1
  this.doneSets = 0

  /* Interfaces */

  /* State changed handlers */
  this.onIntervalChange = onIntervalChange
  this.onCounterChange = onCounterChange
  this.onDoneSetsChange = onDoneSetsChange

  /* The tick() method will update its internal state, and will notify state
   * change handlers if state changed.
   */
  this.tick = function () {
    // Stores states before entering updating algorithm for detecting state changed
    var prevIntervalState = this.currentState
    var prevCounter = this.counter
    var prevDoneSets = this.doneSets

    this.counter -= 1
    switch (this.currentState) {
      case this.IntervalState.WARMUP:
        if (this.counter <= 0) {
          this.counter = this.tSpec.highSecs
          this.currentState = this.IntervalState.HIGH
        }
        break

      case this.IntervalState.HIGH:
        if (this.counter <= 0) {
          this.doneSets += 1
          this.counter = this.tSpec.lowSecs
          this.currentState = this.IntervalState.LOW
        }
        break

      case this.IntervalState.LOW:
        if (this.counter <= 0) {
          if (this.doneSets === this.tSpec.totalSets) {
            // All sets are done! Congradulations!
            this.counter = this.tSpec.cooldownSecs
            if (this.tSpec.cooldownSecs <= 0) {
              this.currentState = this.IntervalState.DONE
            } else {
              this.currentState = this.IntervalState.COOLDOWN
            }
          } else {
            // ISYMFS!!
            this.counter = this.tSpec.highSecs
            this.currentState = this.IntervalState.HIGH
          }
        }
        break

      case this.IntervalState.COOLDOWN:
        if (this.counter <= 0) {
          this.counter = 0
          this.currentState = this.IntervalState.DONE
        }
        break

      case this.IntervalState.DONE:
        break

      default:
        console.log('Impossible to reach.')
    }
    // Calling assigned handlers if states changed
    if (prevIntervalState !== this.currentState && this.onIntervalChange !== undefined) {
      this.onIntervalChange()
    }
    if (prevCounter !== this.currentState && this.onCounterChange !== undefined) {
      this.onCounterChange()
    }
    if (prevDoneSets !== this.doneSets && this.onDoneSetsChange !== undefined) {
      this.onDoneSetsChange()
    }
  }
}

/* Functions for displaying */

function setTimerValue (secs) {
  /* Set the main countdown timer value */
  var minPart = Math.floor(secs / 60)
  var secPart = secs % 60
  var timerValue = document.getElementById('timer-value')
  timerValue.textContent = zfill(minPart) + ':' + zfill(secPart)
}

function setSetsValue (remain, total) {
  /* Set the 'finished/total' sets value */
  var setsValue = document.getElementById('sets-value')
  setsValue.textContent = zfill(remain) + '/' + zfill(total)
}

function setTimerBackground (r, g, b, a) {
  /* Sets the background of the timer block */
  document.getElementsByClassName('timer-status')[0]
          .style.backgroundColor = 'rgba(' +
                                   r + ',' + g + ',' + b + ',' + a + ')'
}

/* Main function */
function main () {
  var tSpec = new TimingSpec(15, 20, 40, 300, 20)
  var intervalHandler = null

  setTimerValue(tSpec.warmupSecs)
  setSetsValue(0, tSpec.totalSets)
  setTimerBackground(255, 255, 0, 1)

  /* Buttons */
  var settingBtn = document.getElementById('setting-btn')
  var startBtn = document.getElementById('start-btn')
  var resetBtn = document.getElementById('reset-btn')
  resetBtn.disabled = true

  /* Sounds */
  var beepSound = document.getElementById('beep-sound')

  function onIntervalChangeHandler () {
    beepSound.play()
    switch (this.currentState) {
      case this.IntervalState.WARMUP:
        setTimerBackground(255, 255, 0, 0.9)
        break
      case this.IntervalState.HIGH:
        setTimerBackground(255, 0, 0, 0.9)
        break
      case this.IntervalState.LOW:
        setTimerBackground(0, 255, 0, 0.9)
        break
      case this.IntervalState.COOLDOWN:
        setTimerBackground(0, 0, 255, 0.9)
        break
      case this.IntervalState.DONE:
        resetBtn.disabled = false
        setTimerValue(0)
        setSetsValue(0, hiitTimer.tSpec.totalSets)
        setTimerBackground(255, 255, 0, 1)
        clearInterval(intervalHandler)
        break
    }
  }

  function onCounterChangeHandler () {
    setTimerValue(this.counter)
  }

  function onDoneSetsChangeHandler () {
    setSetsValue(this.doneSets, this.tSpec.totalSets)
  }

  var hiitTimer = new HiitTimer(tSpec,
                                onIntervalChangeHandler,
                                onCounterChangeHandler,
                                onDoneSetsChangeHandler)

  function onIntervelTimerEvent () {
    hiitTimer.tick()
  }

  /* Buttons behavior */
  startBtn.onclick = function () {
    if (startBtn.textContent === 'Start') {
      startBtn.textContent = 'Pause'
      document.querySelectorAll('.setting input').forEach(function (input) {
        input.disabled = true
      })
      intervalHandler = setInterval(onIntervelTimerEvent, 1000)
      resetBtn.disabled = true
    } else {
      startBtn.textContent = 'Start'
      document.querySelectorAll('.setting input').forEach(function (input) {
        input.disabled = false
      })
      clearInterval(intervalHandler)
      resetBtn.disabled = false
      intervalHandler = null
    }
  }

  settingBtn.onclick = function () {
    var setting = document.querySelector('div.setting')

    if (setting.style.display === '') { // Default value
      setting.style.display = 'none'
    } else if (setting.style.display === 'none') {
      setting.style.display = 'flex'
    } else {
      setting.style.display = 'none'
    }
  }

  resetBtn.onclick = function () {
    if (intervalHandler !== null) {
      clearInterval(intervalHandler)
    }
    hiitTimer = new HiitTimer(tSpec,
                              onIntervalChangeHandler,
                              onCounterChangeHandler,
                              onDoneSetsChangeHandler)
    setTimerValue(tSpec.warmupSecs)
    setSetsValue(0, tSpec.totalSets)
    setTimerBackground(255, 255, 0, 1)
    startBtn.textContent = 'Start'
  }

  /* Input fields behavior */
  document.querySelectorAll('.setting input').forEach(function (input) {
    input.oninput = function () {
      try {
        // Verify all the input field if any input field has inputs
        tSpec = new TimingSpec(document.querySelector('input.warmup').value,
                               document.querySelector('input.high').value,
                               document.querySelector('input.low').value,
                               document.querySelector('input.cooldown').value,
                               document.querySelector('input.sets').value)
      } catch (e) {
        this.style.backgroundColor = '#FF5731'
        startBtn.disabled = true
        settingBtn.disabled = true
        return
      }
      // Verified
      hiitTimer = new HiitTimer(tSpec,
                                onIntervalChangeHandler,
                                onCounterChangeHandler,
                                onDoneSetsChangeHandler)
      this.style.backgroundColor = 'white'
      setTimerValue(tSpec.warmupSecs)
      setSetsValue(0, tSpec.totalSets)
      setTimerBackground(255, 255, 0, 1)
      startBtn.disabled = false
      settingBtn.disabled = false
    }

    input.onblur = input.oninput

    input.onfocus = function () {
      input.select()
      input.style.backgroundColor = 'white'
    }
  })
}

main()
