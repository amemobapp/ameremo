## Git push 運用メモ（権限エラー対策）

今回 `#2` を push できた方法は、SSH ではなく **GitHub CLI のトークンを使った HTTPS push**。

### 背景

- SSH だと `Permission denied` が出ることがある（キーが別アカウントに向くため）
- `gh auth` で権限のあるアカウントに切り替え、`gh auth token` を使うと push 可能

### #2 を push した実コマンド

```bash
git push -u "https://x-access-token:$(gh auth token)@github.com/amemobapp/ameremo.git" HEAD
```

### main を push した実コマンド

```bash
git push "https://x-access-token:$(gh auth token)@github.com/amemobapp/ameremo.git" main
```

### 事前確認（推奨）

```bash
gh auth status
gh auth switch -u joshthemuscat
gh repo view amemobapp/ameremo --json nameWithOwner,viewerPermission,url
```

`viewerPermission` が `WRITE` または `ADMIN` なら push 可能。

### 注意

- 上記コマンドは URL 内に一時的にトークンを含むため、履歴や共有ログの扱いに注意
- 通常はこの方法で push 後、必要に応じてリモートの追跡設定を確認する
