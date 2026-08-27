# Stock Intent Lab V3.3

公开、匿名可访问的CHI股票场景研究原型，用于比较：

- `Chat-only`：信息仍以相同卡片呈现，但详情、Focus、Evidence、Strategy和状态核查必须通过Chat完成；
- `Chat + Widget`：保留Chat入口，同时支持直接操作信息对象和持久查看共享状态。

两条件使用相同的19个固定虚构事实、卡片、顺序、详情、Agent结论和权威状态机。页面不提供真实投资建议，也不展示任何尚未由实验数据支持的效果数字。

## 本地运行

```bash
npm install
npm run dev
```

生产验证：

```bash
npm run lint
npm test
```

## 启动链接

- 无参数：在当前浏览器标签页随机分配一次并锁定条件；
- `?condition=chat_only`：固定Chat-only；
- `?condition=chat_widget`：固定Chat + Widget；
- `?preview=1&condition=chat_widget`：研究者预览，显示条件切换和两条参与者链接。

普通参与者不会看到条件切换器。正式任务前有独立出行教程，结束后清空练习状态再进入Round 00—07。

## 数据边界

当前公开版只把匿名事件日志写入浏览器`localStorage`，结束时由参与者下载JSON；没有研究服务器上传、用户账户或ChatGPT登录依赖。`H`、`L`、样本量、评分codebook和SAP尚未冻结，因此该页面是原型与工程验收环境，不是正式确认性数据采集系统。

设计材料见：

- `docs/stock-experiment-script-v3-8round-draft.md`
- `docs/stock-information-objects-v1.1.md`
- `docs/stock-benefit-metric-v3-final-candidate.md`
- `docs/stock-paper-alignment-v1.md`
- `docs/stock-v3.3-final-chi-review.md`
