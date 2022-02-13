Assumes bot prefix is . (period)

# Permissions
Commands run in read only channel - ???
.summon into Voice Channel it cannot join - Send "Permission denied" Error
Admin commands by non admin user - Send "Permission denied" Error

# Not in Voice Channel
.dc - Send "Not in Voice Channel" Error
Any audio commands - .resume/.seek/etc - Send "Not in Voice Channel" Error
Any queue manipulation commands - .play/.remove/.queue/etc - Send "Not in Voice Channel" Error

# Summon
.summon into Voice Channel. Disconnect it through discord admin interface. Try summon again - Queue should be preserved/What other behavior?
.summon into Voice Channel. Kick it. Try playing songs. - Should attempt rejoining before this/give warning?

# Loop modes
Set .loop mode off, play song - Queue should finish
Set .loop mode song, play song. song should repeat. .seek to halfway - Song should repeat
Set .loop mode queue. Add another song - Should jump to beginning of queue after the 2nd has finished.

# Jumping
(Setup) With one song in queue. Set .loop mode off. Wait for finish.
.jump to position 1 - Queue should finish.
Set .loop mode song. jump to position 1 - Song should repeat after playing.
Add another song. .jump to position 1 - Queue should repeat.

# Pause/resume
.play song, wait for queue to end. Set .loop mode song. .resume playback - song should repeat