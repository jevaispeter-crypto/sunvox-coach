# 08. Common Problems and Debugging

## Core idea

Skilled users do not memorize features.
They diagnose problems quickly.

Most issues in SunVox come from a small number of causes:
- routing
- timing
- polyphony
- arrangement

## No Sound

Check in order:
1. Is Generator connected to Output?
2. Is volume > 0?
3. Is a note triggered?

Most common cause:
→ module not connected to Output

## Sound is Weak / No Punch

Likely causes:
- misaligned timing
- overlapping sounds
- weak layering

Check:
→ alignment of notes (kick + bass)

## Notes Cutting Off

Cause:
→ polyphony too low

Fix:
→ increase polyphony in module

## Groove Feels Off

Likely causes:
- incorrect ticks per line
- inconsistent timing
- wrong grid

Check:
→ 24 ticks per beat rule

## Mix Feels Messy

Cause:
→ too many overlapping elements

Important:
→ NOT an EQ problem first

Fix:
→ remove or simplify layers

## Patterns Feel Limiting

Cause:
→ pattern too short

Fix:
→ extend pattern or merge patterns

## Sound Changes Unexpectedly

Cause:
→ FX commands or automation

Check:
→ pattern FX column

## High CPU / Glitches

Cause:
- too many voices
- too many effects

Fix:
→ reduce polyphony
→ simplify modules

## Key Insight

When something goes wrong:
→ do NOT guess

Always isolate:
- routing
- timing
- density
- control (FX)

Then fix systematically.
