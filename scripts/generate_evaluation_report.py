import json,statistics
from inspect_pdf import ROOT
results=json.loads((ROOT/'data/evaluation.json').read_text(encoding='utf8'))
rows=['# 真实 Flash 合成用例评估','',
      f"共 {len(results)} 条；通过当前自动校验 {sum(x['status']=='ok' for x in results)} 条；耗时中位数 {statistics.median(x['elapsed_ms'] for x in results):.0f} ms，最大 {max(x['elapsed_ms'] for x in results)} ms。",'',
      '自然度、本土性、词语搭配、语义保真、人格一致性、语气词密度均待昆明母语者逐条审核。通过自动检查不等于上述质量合格。候选以外的方言词应优先复核；本版不能完全约束模型只使用给定候选。','',
      '| 类型 | 普通话输入 | 方言输出 | 检索词条 | 命中 | 耗时 ms | 状态 |',
      '|---|---|---|---|---:|---:|---|']
for x in results:
    escape=lambda s:s.replace('|','\\|').replace('\n','<br>')
    rows.append('| '+' | '.join(escape(str(v)) for v in [x['category'],x['draft'],x['text'],'、'.join(c['lemma'] for c in x['candidates']),x['hits'],x['elapsed_ms'],x['status']])+' |')
(ROOT/'data/private/reports').mkdir(parents=True,exist_ok=True)
(ROOT/'data/private/reports/EVALUATION.md').write_text('\n'.join(rows)+'\n',encoding='utf8')
print(rows[2])
