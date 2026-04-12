# Self-Hosted Excalidraw — TODO

## In-Scope Features (Excalidraw+ Parity)

### Done

- [x] Persistent storage on server / cloud sync (auto-save to SQLite + R2)
- [x] Multiple scenes / scene switching
- [x] Dashboard for managing drawings (`/dashboard`)
- [x] Folders (create, rename, delete, move scenes between)
- [x] Access control (Authelia + Nginx, Remote-User header)
- [x] Presentations (frames → slides, fullscreen mode, toolbar with nav/download/dark mode/fullscreen)
- [x] Export/download of .excalidraw files (standard format, compatible with excalidraw.com)
- [x] Import .excalidraw files from excalidraw.com (Load Scene in menu)
- [x] Dark mode support (editor + dashboard)
- [x] Dashboard thumbnail previews (auto-generated every 30s)
- [x] "Open last scene" on `/` (remembers last edited drawing)

### Polish / Improvements

- [ ] Save status indicator in editor (show saving/saved/error)
- [ ] Dashboard: drag scenes into folders
- [ ] Dashboard: bulk select + bulk delete/move
- [ ] Dashboard: sort by folder name in scene list
- [ ] Presentation: remember slide order overrides (manual reorder in sidebar)
- [x] Presentation: using frame tool without dragging (just click) creates a 1920x1080 frame
- [ ] Offline support / graceful degradation when server unreachable
- [ ] Scene title editing from the editor (not just dashboard)

## high priority features

- [ ] Read-only link sharing
- [ ] enable AI feature by allowing to set opanAI api key.(store it safely in the account data)

## low priority features

## technical debt

[ ] sqlite database backups

## Out of Scope (Future Considerations)

- [ ] Team management and multiple accounts
- [ ] Real-time link-based collaboration
- [ ] Database backups
- [ ] Trash system with scheduled deletion
- [ ] Voice features
- [ ] Comments / reactions
- [ ] Email notifications
- [ ] Real-time presentations (multi-client sync)
- [ ] Export to PDF and PPT

