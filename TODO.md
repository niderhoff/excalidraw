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
- [ ] Presentation: "New Slide 16:9" button in sidebar (creates 1920x1080 frame)
- [ ] Offline support / graceful degradation when server unreachable
- [ ] Scene title editing from the editor (not just dashboard)

## Out of Scope (Future Considerations)
- [ ] Team management and multiple accounts
- [ ] Real-time link-based collaboration
- [ ] Read-only link sharing
- [ ] Database backups
- [ ] Trash system with scheduled deletion
- [ ] Voice features
- [ ] AI features
- [ ] Comments / reactions
- [ ] Email notifications
- [ ] Real-time presentations (multi-client sync)
- [ ] Export to PDF and PPT
