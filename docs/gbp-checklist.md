# GBP API設定チェックリスト

## 📋 IT担当者向け簡単チェックリスト

### ✅ Step 1: 事前確認
- [ ] Googleアカウントがある
- [ ] 各店舗のGBP管理者権限がある
- [ ] Google Cloud Consoleアクセス権がある

### ✅ Step 2: Google Cloud Console
1. [ ] GCPプロジェクト作成/選択
2. [ ] 「Business Profile API」を有効化
3. [ ] 「OAuth 2.0 クライアントID」を作成
4. [ ] 承認済みリダイレクトURIを設定
   - `http://localhost:3000/api/auth/callback`

### ✅ Step 3: 権限確認
- [ ] 各店舗の管理者権限を確認
- [ ] Business Accountの管理権限を確認

### ✅ Step 4: 認証情報共有
- [ ] クライアントIDを共有
- [ ] クライアントシークレットを共有

## 🎯 やるべきこと（3行で）
1. Google Cloud Consoleで「Business Profile API」を有効化
2. OAuth 2.0クライアントを作成し、認証情報を共有
3. 各店舗の管理者権限を確認

## ⚡ 5分でできる確認方法
```
1. Google Cloud Consoleにログイン
2. 「APIとサービス」→「ライブラリ」
3. 「Business Profile API」を検索
4. 「有効にする」をクリック
```

## 📞 つまずいたら
- 権限問題 → Google Businessの管理者に確認
- 技術的な問題 → 開発者に連絡
- APIが見つからない → 「Google My Business API」で検索
