# chainx-trustee-scripts

Scripts for ChainX trustee

# Config

- network

比特币网络类型，一般为 mainnet 或 testnet。

- bitcoin_fee_rate

构建比特币交易时所用的 fee rate，单位为聪。

- min_change

最小找零，构造的比特币交易找零小于改值时，放弃该找零。

- chainx_ws_addr

ChainX websocket 链接地址。

# How to use

1. 显示当前提现列表

```javascript
yarn run list
```

2. 显示链上信托代签原文

```javascript
yarn run tx
```

3. 构造提现交易原文并打印 hex（暂时没有提交上链）

```javascript
yarn run create
```

4. 相应待签原文并打印 hex（暂时没有提交上链）

```javascript
yarn run respond
```
