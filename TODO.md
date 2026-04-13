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

- [x] Save status indicator in editor (saving/saved/error in footer)
- [x] Scene title editing from the editor (click title in top-left)
- [x] Presentation: using frame tool without dragging (just click) creates a 1920x1080 frame
- [x] Auto-redirect to Authelia on session expiry (401 → reload)
- [x] Dashboard: drag scenes into folders
- [x] Dashboard: bulk select + bulk delete/move (Ctrl/Cmd+click to select)
- [x] Dashboard: sort by folder name in scene list
- [x] Offline support / graceful degradation when server unreachable

## high priority features

- [x] Read-only link sharing (crypto-random tokens, configurable expiry, revocable)
- [x] enable AI feature by allowing to set OpenAI api key (stored server-side, proxied through backend)

## low priority features

- [ ] download presentation PDF and PPT (even with read-only link)
- [ ] Real-time link-based collaboration (should we use impelemnt it client side only or server-side?)

## technical debt

- [ ] sqlite database backups to R2 (with litestream)

## Out of Scope (Future Considerations)

- [ ] Team management and multiple accounts
- [ ] Trash system with scheduled deletion
- [ ] Voice features
- [ ] Comments / reactions
- [ ] Email notifications
- [ ] Presentation: remember slide order overrides (manual reorder in sidebar)
- [ ] Real-time presentations (multi-client sync)
