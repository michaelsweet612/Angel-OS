# Angel-OS Repository Rules & Release Policy

## Mandatory Release Policy
- **Release on every change:** Every code, UI, configuration, or documentation change—including small fixes or tweaks—must be accompanied by a new versioned release (`vX.Y.Z`) with downloadable build artifacts.
- **Detailed changelog breakdown:** Every release note must document:
  1. **Added:** Everything new introduced in the release.
  2. **Removed:** Everything deleted, replaced, or retired.
  3. **Why Removed:** Clear engineering rationale explaining why each removed item was retired or replaced.
- **Natural engineering prose:** Write release notes directly and clearly. Never include meta phrasing such as *"the user requested this"* or *"as requested by the user"*.

## Pull Request Policy
- **One new pull request per change:** Never reuse or pile new changes onto an existing pull request. Create a dedicated feature branch and open a separate new pull request for every release or change.

## Licensing Note
- All Angel-OS repository modules and assets are licensed strictly for personal download and local execution under [`LICENSE`](./LICENSE). Do not add permissive open-source re-licensing text that contradicts no-republication terms.
