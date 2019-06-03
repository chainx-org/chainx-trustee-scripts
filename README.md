# chainx-trustee-scripts

Scripts for ChainX trustee

# Config

- bitcoin_fee_rate

构建比特币交易时所用的 fee rate，单位为聪。

- min_change

最小找零，构造的比特币交易找零小于改值时，放弃该找零。

- chainx_ws_addr

ChainX websocket 链接地址。

- bitcoin_private_key

比特币私钥（目前只之前 WIF 格式）

- chainx_private_key

ChainX 账户私钥，用于签名并提交 ChainX 交易。

# How to use

1. 显示当前提现列表

```javascript
yarn run list
```

2. 显示链上信托代签原文

```javascript
yarn run tx
```

3. 构造提现交易原文

如果仅需构造交易原文，不需要提交原文，执行：

```javascript
yarn run create
```

如果需要马上将所构造的交易提交到 ChainX 链上，则执行：

```javascript
yarn run create-sub
```

同时，须确保设置 `bitcoin_private_key`和`chainx_private_key`。

4. 相应待签原文

如果仅响应待签原文，暂不提交上链，执行：

```javascript
yarn run respond
```

如果需要马上将所构造的交易提交到 ChainX 链上，则执行：

```javascript
yarn run respond-sub
```
