import React, { useState, useEffect } from 'react';
import { Button, Tag, Row, Col, Typography, Space, Collapse, Tabs, Alert, Spin, Badge, message, Segmented, Steps, Progress } from 'antd';
import {
  SwapOutlined, ThunderboltOutlined, RocketOutlined, CodeOutlined, ToolOutlined,
  ClockCircleOutlined, SafetyOutlined, CopyOutlined, ArrowRightOutlined,
  ScanOutlined, BranchesOutlined, CheckCircleOutlined, UndoOutlined, BulbOutlined,
} from '@ant-design/icons';
import { ProCard, StatisticCard, ProDescriptions } from '@ant-design/pro-components';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { getMigrationReport, scanDemo } from '../lib/api';

const { Text, Title, Paragraph } = Typography;
const { Divider } = StatisticCard;
const RCQ = { CRITICAL:'#ff4757', HIGH:'#ff6b35', MEDIUM:'#ffa502', LOW:'#2ed573' };
const STRAT_LABELS = { pure_pqc:'纯 PQC 迁移', hybrid:'混合模式（推荐）', crypto_agile:'密码敏捷化' };
const STRAT_COLORS = { pure_pqc:'green', hybrid:'blue', crypto_agile:'orange' };
const STRAT_DESC = {
  pure_pqc:'策略 A — 直接替换为 NIST 标准化的后量子算法 (ML-KEM / ML-DSA / SLH-DSA)。适合新项目或内部系统。',
  hybrid:'策略 B — 同时使用经典算法和后量子算法，双重保护。即使其中一种被破解，另一种仍然安全。这是 Google、Cloudflare 采用的主流方案。',
  crypto_agile:'策略 C — 重构代码使密码学算法可配置、可热切换。为未来标准演进做好准备。不立即替换算法。',
};
const diffStyles = { variables: { dark: {
  diffViewerBackground:'#060614', addedBackground:'#0a2a0a', removedBackground:'#2a0a0a',
  wordAddedBackground:'#0f3f0f', wordRemovedBackground:'#3f0f0f',
  addedGutterBackground:'#0a2a0a', removedGutterBackground:'#2a0a0a',
  gutterBackground:'#060614', codeFoldBackground:'#0d0d28',
}}, line:{ fontSize:12, fontFamily:"'JetBrains Mono', monospace" }};

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function Migration({ scanResult, onNavigate }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState('hybrid');

  const generate = async (sr) => {
    const target = sr || scanResult;
    if (!target?.id) { message.warning('请先扫描代码'); return; }
    setLoading(true);
    try { setReport(await getMigrationReport(target.id)); } catch(e){ message.error(e.message); }
    setLoading(false);
  };
  const runDemoMigrate = async () => {
    setLoading(true);
    try { const sr = await scanDemo(); setReport(await getMigrationReport(sr.id)); } catch(e){ message.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { if (scanResult?.id && !report) generate(scanResult); }, [scanResult]);
  const copy = t => { navigator.clipboard.writeText(t); message.success('已复制到剪贴板'); };

  /* ─── Empty state ─── */
  if (!report && !loading) return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
      style={{ textAlign:'center', padding:'60px 20px' }}>
      <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        <RocketOutlined style={{ fontSize:80, color:'#6C5CE7', filter:'drop-shadow(0 0 24px rgba(108,92,231,0.4))', marginBottom:28, display:'block' }} />
      </motion.div>
      <Title level={3} className="gradient-text" style={{ margin:'0 0 8px' }}>QuantumShield Migration Engine</Title>
      <Paragraph style={{ color:'#7a7a9e', maxWidth:580, margin:'0 auto 12px', fontSize:14, lineHeight:1.8 }}>
        三种迁移策略 — <Tag color="green">Pure PQC</Tag><Tag color="blue">Hybrid（推荐）</Tag><Tag color="orange">Crypto-Agility</Tag>
      </Paragraph>
      <Paragraph style={{ color:'#555577', maxWidth:520, margin:'0 auto 32px', fontSize:12 }}>
        自动生成代码 Diff、依赖安装命令、回滚脚本、自动化测试模板。支持 Python · Java · Go · JavaScript · C/C++ · Rust。
      </Paragraph>
      <Space direction="vertical" size={12}>
        {scanResult?.id ? (
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={()=>generate()} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>生成迁移方案</Button>
        ) : (<>
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={runDemoMigrate} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>演示：扫描 + 一键迁移</Button>
          <Button size="large" icon={<ScanOutlined />} onClick={()=>onNavigate?.('scanner')}
            style={{ borderColor:'rgba(108,92,231,0.4)', color:'#a29bfe' }}>先去扫描代码</Button>
        </>)}
      </Space>
    </motion.div>
  );

  if (loading) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'60px 20px' }}>
      <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
        <RocketOutlined style={{ fontSize: 64, color: '#6C5CE7', filter: 'drop-shadow(0 0 20px rgba(108,92,231,0.5))', display: 'block', marginBottom: 24 }} />
      </motion.div>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Text style={{ color: '#a29bfe', fontSize: 15, fontWeight: 600 }}>正在生成迁移方案...</Text>
        <div style={{ margin: '16px 0 8px', padding: '14px 20px', background: 'rgba(108,92,231,0.04)', borderRadius: 12, border: '1px solid rgba(108,92,231,0.1)' }}>
          <Steps size="small" current={1}
            items={[
              { title: '扫描', description: '代码分析', icon: <CheckCircleOutlined style={{ color: '#2ed573' }} /> },
              { title: '匹配', description: 'PQC 替代', icon: <RocketOutlined spin style={{ color: '#6C5CE7' }} /> },
              { title: '生成', description: '代码 Diff' },
              { title: '完成', description: '迁移报告' },
            ]} />
        </div>
        <Progress
          percent={75}
          status="active"
          strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
          trailColor="rgba(26,26,66,0.6)"
          strokeWidth={6}
          style={{ marginTop: 16 }}
        />
        <Text style={{ color: '#555577', fontSize: 12, display: 'block', marginTop: 8 }}>分析量子脆弱算法，匹配 PQC 替代方案，生成代码 Diff...</Text>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.08 }} }}
      style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Stats ═══ */}
      <motion.div variants={fadeUp}>
        <StatisticCard.Group direction="row" style={{ borderRadius:12, overflow:'hidden' }}>
          <StatisticCard statistic={{ title:'需迁移', value:report.total_migrations, valueStyle:{color:'#6C5CE7'}, icon:<SwapOutlined style={{color:'#6C5CE7'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title:'立即修复', value:report.estimated_effort?.breakdown?.immediate||0, valueStyle:{color:'#ff4757'}, icon:<ThunderboltOutlined style={{color:'#ff4757'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title:'预估工时', value:report.estimated_effort?.total_days||0, suffix:'天', valueStyle:{color:'#ffa502'}, icon:<ClockCircleOutlined style={{color:'#ffa502'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title:'新依赖', value:report.dependencies?.length||0, valueStyle:{color:'#2ed573'}, icon:<ToolOutlined style={{color:'#2ed573'}} /> }} />
        </StatisticCard.Group>
      </motion.div>

      {/* ═══ Strategy Selector ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><BranchesOutlined style={{ marginRight:8, color:'#6C5CE7' }} />选择迁移策略</span>}
          className="qs-card" headerBorderless>
          <Segmented value={strategy} onChange={setStrategy} block
            options={Object.entries(STRAT_LABELS).map(([k,v])=>({ value:k, label:<span><Tag color={STRAT_COLORS[k]} style={{ marginRight:4, borderRadius:4 }}>{v}</Tag></span> }))} />
          <Alert message={STRAT_DESC[strategy]} type="info" showIcon icon={<BulbOutlined />}
            className="qs-alert-info" style={{ marginTop:12 }} />
        </ProCard>
      </motion.div>

      {/* ═══ Phased Plan ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><ClockCircleOutlined style={{ marginRight:8, color:'#6C5CE7' }} />分阶段迁移计划</span>}
          className="qs-card" headerBorderless>
          <Steps direction="vertical" size="small" current={-1}
            items={report.phases?.map((ph,i) => ({
              title: <span style={{ color:'#fff', fontWeight:600 }}>Phase {ph.phase}: {ph.name} <Tag style={{ fontSize:10, borderRadius:4 }} color={i===0?'red':i===1?'orange':'blue'}>{ph.timeline}</Tag></span>,
              description: (
                <div style={{ paddingBottom:12 }}>
                  <Paragraph style={{ color:'#7a7a9e', marginBottom:8, fontSize:13 }}>{ph.description}</Paragraph>
                  {ph.items?.slice(0,8).map((p,j) => (
                    <div key={j} style={{ padding:'8px 14px', marginBottom:3, background:'#060614', borderRadius:8, borderLeft:`3px solid ${RCQ[p.finding.quantum_risk]||'#555'}`, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <Tag className={`tag-${p.finding.quantum_risk.toLowerCase()}`} style={{ fontSize:10 }}>{p.finding.quantum_risk}</Tag>
                      <Text strong style={{ color:'#ff7875', fontSize:12 }}>{p.finding.algorithm}</Text>
                      <ArrowRightOutlined style={{ color:'#4a4a6e', fontSize:10 }} />
                      <Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{p.finding.migration_target}</Tag>
                      <Text style={{ color:'#4a4a6e', fontSize:11 }}>{p.finding.file_path}:L{p.finding.line_number}</Text>
                      <Tag style={{ fontSize:10, marginLeft:'auto', borderRadius:4 }}>{p.effort}</Tag>
                    </div>
                  ))}
                  {(!ph.items || ph.items.length===0) && <Text style={{ color:'#4a4a6e', fontSize:12 }}>全面回归测试、安全审计、CBOM 生成、合规验证</Text>}
                </div>
              ),
              icon: <Badge count={ph.items?.length||0} style={{ backgroundColor: i===0?'#ff4757':i===1?'#ff6b35':i===2?'#ffa502':'#6C5CE7' }} />,
              status: 'process',
            }))} />
        </ProCard>
      </motion.div>

      {/* ═══ Install Commands ═══ */}
      {report.install_commands?.length > 0 && (
        <motion.div variants={fadeUp}>
          <ProCard title={<span><ToolOutlined style={{ marginRight:8, color:'#2ed573' }} />依赖安装命令</span>}
            className="qs-card" headerBorderless>
            {report.install_commands.map((cmd,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                <code style={{ flex:1, color:'#2ed573', whiteSpace:'pre-wrap', background:'#060614', border:'1px solid var(--qs-border)', borderRadius:10, padding:'10px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:12 }}>$ {cmd}</code>
                <Button size="small" icon={<CopyOutlined />} onClick={()=>copy(cmd)} style={{ borderColor:'var(--qs-border)', borderRadius:8 }} />
              </div>
            ))}
          </ProCard>
        </motion.div>
      )}

      {/* ═══ Code Diff ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><CodeOutlined style={{ marginRight:8, color:'#6C5CE7' }} />代码迁移 — <Tag color={STRAT_COLORS[strategy]} style={{ borderRadius:4 }}>{STRAT_LABELS[strategy]}</Tag></span>}
          className="qs-card" headerBorderless>
          <Tabs tabPosition="left" style={{ minHeight:400 }}
            items={Object.entries(report.by_algorithm||{}).map(([algo,plans])=>({
              key:algo,
              label:<span style={{ fontSize:12 }}><Badge count={plans.length} size="small" style={{ marginRight:6 }} />{algo}</span>,
              children: plans.map((plan,i) => {
                const strat = plan.strategies?.[strategy] || plan.strategies?.pure_pqc || Object.values(plan.strategies)[0];
                if (!strat) return null;
                return (
                  <ProCard key={i} size="small" style={{ background:'#060614', border:'1px solid var(--qs-border)', marginBottom:12, borderRadius:12 }}
                    title={<span style={{ color:'#ddd', fontSize:13 }}><CheckCircleOutlined style={{ color:'#2ed573', marginRight:6 }} />{strat.name} <Tag color="blue" style={{ fontSize:10, borderRadius:4 }}>{strat.nist_standard}</Tag></span>}
                    extra={<Tag style={{ fontSize:10, borderRadius:4 }}>{plan.effort}</Tag>} headerBorderless>
                    <div style={{ marginBottom:8 }}>
                      <Text type="secondary" style={{ fontSize:11 }}>位置: </Text>
                      <Text code style={{ fontSize:11 }}>{plan.finding.file_path}:L{plan.finding.line_number}</Text>
                    </div>
                    {strat.before_code && strat.after_code && (
                      <div className="diff-viewer-wrapper" style={{ marginBottom:8 }}>
                        <ReactDiffViewer oldValue={strat.before_code} newValue={strat.after_code}
                          splitView useDarkTheme leftTitle="迁移前" rightTitle="迁移后" styles={diffStyles} />
                      </div>
                    )}
                    <Collapse style={{ background:'transparent', border:'none' }}
                      items={[
                        plan.test_template && { key:'test', label:<Text style={{ color:'#2ed573', fontSize:12 }}><CheckCircleOutlined style={{ marginRight:4 }} />测试模板</Text>,
                          children:<div style={{ position:'relative' }}>
                            <Button size="small" icon={<CopyOutlined />} onClick={()=>copy(plan.test_template)} style={{ position:'absolute', top:8, right:8, zIndex:1, borderRadius:6 }} />
                            <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{ fontSize:11, margin:0, borderRadius:8, background:'#060614' }}>{plan.test_template}</SyntaxHighlighter>
                          </div> },
                        plan.rollback_plan && { key:'rollback', label:<Text style={{ color:'#ffa502', fontSize:12 }}><UndoOutlined style={{ marginRight:4 }} />回滚方案</Text>,
                          children:<SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ fontSize:11, margin:0, borderRadius:8, background:'#060614' }}>{plan.rollback_plan}</SyntaxHighlighter> },
                      ].filter(Boolean)} />
                  </ProCard>
                );
              }),
            }))} />
        </ProCard>
      </motion.div>

      {/* ═══ Compliance Mapping ═══ */}
      {report.compliance_mapping && (
        <motion.div variants={fadeUp}>
          <ProCard title={<span><SafetyOutlined style={{ marginRight:8, color:'#6C5CE7' }} />合规映射</span>}
            className="qs-card" headerBorderless>
            <ProCard gutter={[10,10]} ghost wrap>
              {Object.entries(report.compliance_mapping).map(([k,v])=>(
                <ProCard key={k} colSpan={6} style={{
                  background:'#060614', borderRadius:10,
                  borderLeft:`3px solid ${v.status==='NON_COMPLIANT'?'#ff4757':v.status==='COMPLIANT'?'#2ed573':'#ffa502'}`,
                }}>
                  <Tag color={v.status==='NON_COMPLIANT'?'red':v.status==='COMPLIANT'?'green':'orange'}
                    style={{ fontSize:10, marginBottom:6, borderRadius:4 }}>{v.status}</Tag>
                  <div style={{ color:'#ddd', fontSize:12, lineHeight:1.5 }}>{v.details}</div>
                  {v.deadline && <div style={{ color:'#4a4a6e', fontSize:10, marginTop:4 }}>Deadline: {v.deadline}</div>}
                </ProCard>
              ))}
            </ProCard>
          </ProCard>
        </motion.div>
      )}

      {/* ═══ Notes ═══ */}
      <motion.div variants={fadeUp}>
        <Alert
          message={<span style={{ fontWeight:600 }}>迁移注意事项</span>}
          description={<ul style={{ margin:'8px 0', paddingLeft:20, color:'#bbb', fontSize:13, lineHeight:1.8 }}>
            <li>推荐 Hybrid 混合模式过渡 — Google / Cloudflare 主流方案</li>
            <li>PQC 密钥/签名尺寸较大 (ML-KEM-768 公钥 1,184 字节)，评估网络和存储影响</li>
            <li>使用 liboqs / Bouncy Castle / circl 等成熟库</li>
            <li>充分回归测试，生成 CBOM 并通过 CycloneDX 验证</li>
          </ul>}
          type="info" showIcon icon={<SafetyOutlined />}
          className="qs-alert-info"
        />
      </motion.div>
    </motion.div>
  );
}
