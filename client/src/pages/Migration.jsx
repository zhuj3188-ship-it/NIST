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
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { getMigrationReport, scanDemo } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Text, Title, Paragraph } = Typography;
const { Divider } = StatisticCard;
const RCQ = { CRITICAL:'#ff4757', HIGH:'#ff6b35', MEDIUM:'#ffa502', LOW:'#2ed573' };
const STRAT_LABELS = { pure_pqc: 'Pure PQC', hybrid: 'Hybrid', crypto_agile: 'Crypto-Agile' };
const STRAT_COLORS = { pure_pqc:'green', hybrid:'blue', crypto_agile:'orange' };

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function Migration({ scanResult, onNavigate }) {
  const { isDark, colors } = useTheme();
  const { t, lang } = useI18n();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState('hybrid');
  const isZh = lang === 'zh';

  const STRAT_DESC = {
    pure_pqc: isZh ? '策略 A — 直接替换为 NIST 标准化的后量子算法 (ML-KEM / ML-DSA / SLH-DSA)。适合新项目或内部系统。' : 'Strategy A — Replace directly with NIST-standardized PQC algorithms (ML-KEM / ML-DSA / SLH-DSA). Best for new projects or internal systems.',
    hybrid: isZh ? '策略 B — 同时使用经典算法和后量子算法，双重保护。即使其中一种被破解，另一种仍然安全。这是 Google、Cloudflare 采用的主流方案。' : 'Strategy B — Use both classical and PQC algorithms for dual protection. Even if one is broken, the other remains secure. This is the mainstream approach used by Google and Cloudflare.',
    crypto_agile: isZh ? '策略 C — 重构代码使密码学算法可配置、可热切换。为未来标准演进做好准备。不立即替换算法。' : 'Strategy C — Refactor code to make cryptographic algorithms configurable and hot-swappable. Prepares for future standard evolution without immediate replacement.',
  };

  const diffStyles = isDark
    ? { variables: { dark: {
        diffViewerBackground:'#060614', addedBackground:'#0a2a0a', removedBackground:'#2a0a0a',
        wordAddedBackground:'#0f3f0f', wordRemovedBackground:'#3f0f0f',
        addedGutterBackground:'#0a2a0a', removedGutterBackground:'#2a0a0a',
        gutterBackground:'#060614', codeFoldBackground:'#0d0d28',
      }}, line:{ fontSize:12, fontFamily:"'JetBrains Mono', monospace" }}
    : { variables: { light: {
        diffViewerBackground:'#fafafe', addedBackground:'#e6ffed', removedBackground:'#ffebe9',
        wordAddedBackground:'#acf2bd', wordRemovedBackground:'#fdaeb7',
        addedGutterBackground:'#e6ffed', removedGutterBackground:'#ffebe9',
        gutterBackground:'#f6f8fa', codeFoldBackground:'#f0f0f5',
      }}, line:{ fontSize:12, fontFamily:"'JetBrains Mono', monospace" }};

  const codeStyle = isDark ? vscDarkPlus : oneLight;
  const trailColor = isDark ? 'rgba(26,26,66,0.6)' : '#f0f0f5';

  const generate = async (sr) => {
    const target = sr || scanResult;
    if (!target?.id) { message.warning(t('migrate.scan_prompt')); return; }
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
  const copy = txt => { navigator.clipboard.writeText(txt); message.success(isZh ? '已复制到剪贴板' : 'Copied to clipboard'); };

  /* ─── Empty state ─── */
  if (!report && !loading) return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
      style={{ textAlign:'center', padding:'60px 20px' }}>
      <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        <RocketOutlined style={{ fontSize:80, color:'#6C5CE7', filter:'drop-shadow(0 0 24px rgba(108,92,231,0.4))', marginBottom:28, display:'block' }} />
      </motion.div>
      <Title level={3} className="gradient-text" style={{ margin:'0 0 8px' }}>{t('migrate.title')}</Title>
      <Paragraph style={{ color: colors.textSecondary, maxWidth:580, margin:'0 auto 12px', fontSize:14, lineHeight:1.8 }}>
        {t('migrate.strategies')} — <Tag color="green">{t('migrate.pure_pqc')}</Tag><Tag color="blue">{t('migrate.hybrid')}</Tag><Tag color="orange">{t('migrate.crypto_agile')}</Tag>
      </Paragraph>
      <Paragraph style={{ color: colors.textDim, maxWidth:520, margin:'0 auto 32px', fontSize:12 }}>
        {t('migrate.desc')}
      </Paragraph>
      <Space direction="vertical" size={12}>
        {scanResult?.id ? (
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={()=>generate()} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>{t('migrate.generate')}</Button>
        ) : (<>
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={runDemoMigrate} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>{t('migrate.demo_migrate')}</Button>
          <Button size="large" icon={<ScanOutlined />} onClick={()=>onNavigate?.('scanner')}
            style={{ borderColor:'rgba(108,92,231,0.4)', color: colors.accent }}>{t('migrate.scan_first')}</Button>
        </>)}
      </Space>
    </motion.div>
  );

  if (loading) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'40px 20px' }}>
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <RocketOutlined style={{ fontSize: 48, color: '#6C5CE7', filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.4))', display: 'block', marginBottom: 20 }} />
      </motion.div>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Text style={{ color: colors.accent, fontSize: 15, fontWeight: 600 }}>{t('migrate.generating')}</Text>
        <div style={{ margin: '16px 0 8px', padding: '14px 20px', background: isDark ? 'rgba(108,92,231,0.04)' : 'rgba(108,92,231,0.03)', borderRadius: 12, border: `1px solid ${isDark ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.08)'}` }}>
          <Steps size="small" current={1}
            items={[
              { title: isZh ? '扫描' : 'Scan', description: isZh ? '代码分析' : 'Analyze code', icon: <CheckCircleOutlined style={{ color: '#2ed573' }} /> },
              { title: isZh ? '匹配' : 'Match', description: isZh ? 'PQC 替代' : 'PQC alternatives', icon: <RocketOutlined spin style={{ color: '#6C5CE7' }} /> },
              { title: isZh ? '生成' : 'Generate', description: isZh ? '代码 Diff' : 'Code Diff' },
              { title: isZh ? '完成' : 'Done', description: isZh ? '迁移报告' : 'Migration report' },
            ]} />
        </div>
        <Progress
          percent={75} status="active"
          strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
          trailColor={trailColor} strokeWidth={6} style={{ marginTop: 16 }}
        />
        <Text style={{ color: colors.textDim, fontSize: 12, display: 'block', marginTop: 8 }}>
          {isZh ? '分析量子脆弱算法，匹配 PQC 替代方案，生成代码 Diff...' : 'Analyzing quantum-vulnerable algorithms, matching PQC alternatives, generating code diff...'}
        </Text>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.08 }} }}
      style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ═══ Stats ═══ */}
      <motion.div variants={fadeUp}>
        <StatisticCard.Group direction="row" style={{ borderRadius:12, overflow:'hidden' }}>
          <StatisticCard statistic={{ title: isZh ? '需迁移' : 'To Migrate', value:report.total_migrations, valueStyle:{color:'#6C5CE7'}, icon:<SwapOutlined style={{color:'#6C5CE7'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title: isZh ? '立即修复' : 'Immediate Fix', value:report.estimated_effort?.breakdown?.immediate||0, valueStyle:{color:'#ff4757'}, icon:<ThunderboltOutlined style={{color:'#ff4757'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title: isZh ? '预估工时' : 'Est. Days', value:report.estimated_effort?.total_days||0, suffix: isZh ? '天' : 'd', valueStyle:{color:'#ffa502'}, icon:<ClockCircleOutlined style={{color:'#ffa502'}} /> }} />
          <Divider type="vertical" />
          <StatisticCard statistic={{ title: isZh ? '新依赖' : 'New Deps', value:report.dependencies?.length||0, valueStyle:{color:'#2ed573'}, icon:<ToolOutlined style={{color:'#2ed573'}} /> }} />
        </StatisticCard.Group>
      </motion.div>

      {/* ═══ Strategy Selector ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><BranchesOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '选择迁移策略' : 'Select Migration Strategy'}</span>}
          className="qs-card" headerBorderless>
          <Segmented value={strategy} onChange={setStrategy} block
            options={Object.entries(STRAT_LABELS).map(([k,v])=>({ value:k, label:<span><Tag color={STRAT_COLORS[k]} style={{ marginRight:4, borderRadius:4 }}>{v}</Tag></span> }))} />
          <Alert message={STRAT_DESC[strategy]} type="info" showIcon icon={<BulbOutlined />}
            className="qs-alert-info" style={{ marginTop:12 }} />
        </ProCard>
      </motion.div>

      {/* ═══ Phased Plan ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><ClockCircleOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '分阶段迁移计划' : 'Phased Migration Plan'}</span>}
          className="qs-card" headerBorderless>
          <Steps direction="vertical" size="small" current={-1}
            items={report.phases?.map((ph,i) => ({
              title: <span style={{ color: colors.text, fontWeight:600 }}>Phase {ph.phase}: {ph.name} <Tag style={{ fontSize:10, borderRadius:4 }} color={i===0?'red':i===1?'orange':'blue'}>{ph.timeline}</Tag></span>,
              description: (
                <div style={{ paddingBottom:12 }}>
                  <Paragraph style={{ color: colors.textSecondary, marginBottom:8, fontSize:13 }}>{ph.description}</Paragraph>
                  {ph.items?.slice(0,8).map((p,j) => (
                    <div key={j} style={{ padding:'8px 14px', marginBottom:3, background: 'var(--qs-inner-card-bg)', borderRadius:8, borderLeft:`3px solid ${RCQ[p.finding.quantum_risk]||'#555'}`, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <Tag className={`tag-${p.finding.quantum_risk.toLowerCase()}`} style={{ fontSize:10 }}>{p.finding.quantum_risk}</Tag>
                      <Text strong style={{ color:'#ff7875', fontSize:12 }}>{p.finding.algorithm}</Text>
                      <ArrowRightOutlined style={{ color: colors.textDim, fontSize:10 }} />
                      <Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{p.finding.migration_target}</Tag>
                      <Text style={{ color: colors.textDim, fontSize:11 }}>{p.finding.file_path}:L{p.finding.line_number}</Text>
                      <Tag style={{ fontSize:10, marginLeft:'auto', borderRadius:4 }}>{p.effort}</Tag>
                    </div>
                  ))}
                  {(!ph.items || ph.items.length===0) && <Text style={{ color: colors.textDim, fontSize:12 }}>{isZh ? '全面回归测试、安全审计、CBOM 生成、合规验证' : 'Full regression testing, security audit, CBOM generation, compliance verification'}</Text>}
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
          <ProCard title={<span><ToolOutlined style={{ marginRight:8, color:'#2ed573' }} />{isZh ? '依赖安装命令' : 'Dependency Install Commands'}</span>}
            className="qs-card" headerBorderless>
            {report.install_commands.map((cmd,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                <code style={{ flex:1, color:'#2ed573', whiteSpace:'pre-wrap', background: 'var(--qs-inner-card-bg)', border:'1px solid var(--qs-border)', borderRadius:10, padding:'10px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:12 }}>$ {cmd}</code>
                <Button size="small" icon={<CopyOutlined />} onClick={()=>copy(cmd)} style={{ borderColor:'var(--qs-border)', borderRadius:8 }} />
              </div>
            ))}
          </ProCard>
        </motion.div>
      )}

      {/* ═══ Code Diff ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard title={<span><CodeOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '代码迁移' : 'Code Migration'} — <Tag color={STRAT_COLORS[strategy]} style={{ borderRadius:4 }}>{STRAT_LABELS[strategy]}</Tag></span>}
          className="qs-card" headerBorderless>
          <Tabs tabPosition="left" style={{ minHeight:400 }}
            items={Object.entries(report.by_algorithm||{}).map(([algo,plans])=>({
              key:algo,
              label:<span style={{ fontSize:12 }}><Badge count={plans.length} size="small" style={{ marginRight:6 }} />{algo}</span>,
              children: plans.map((plan,i) => {
                const strat = plan.strategies?.[strategy] || plan.strategies?.pure_pqc || Object.values(plan.strategies)[0];
                if (!strat) return null;
                return (
                  <ProCard key={i} size="small" style={{ background: 'var(--qs-inner-card-bg)', border:'1px solid var(--qs-border)', marginBottom:12, borderRadius:12 }}
                    title={<span style={{ color: 'var(--qs-inner-card-text)', fontSize:13 }}><CheckCircleOutlined style={{ color:'#2ed573', marginRight:6 }} />{strat.name} <Tag color="blue" style={{ fontSize:10, borderRadius:4 }}>{strat.nist_standard}</Tag></span>}
                    extra={<Tag style={{ fontSize:10, borderRadius:4 }}>{plan.effort}</Tag>} headerBorderless>
                    <div style={{ marginBottom:8 }}>
                      <Text type="secondary" style={{ fontSize:11 }}>{isZh ? '位置' : 'Location'}: </Text>
                      <Text code style={{ fontSize:11 }}>{plan.finding.file_path}:L{plan.finding.line_number}</Text>
                    </div>
                    {strat.before_code && strat.after_code && (
                      <div className="diff-viewer-wrapper" style={{ marginBottom:8 }}>
                        <ReactDiffViewer oldValue={strat.before_code} newValue={strat.after_code}
                          splitView useDarkTheme={isDark} leftTitle={isZh ? '迁移前' : 'Before'} rightTitle={isZh ? '迁移后' : 'After'} styles={diffStyles} />
                      </div>
                    )}
                    <Collapse style={{ background:'transparent', border:'none' }}
                      items={[
                        plan.test_template && { key:'test', label:<Text style={{ color:'#2ed573', fontSize:12 }}><CheckCircleOutlined style={{ marginRight:4 }} />{isZh ? '测试模板' : 'Test Template'}</Text>,
                          children:<div style={{ position:'relative' }}>
                            <Button size="small" icon={<CopyOutlined />} onClick={()=>copy(plan.test_template)} style={{ position:'absolute', top:8, right:8, zIndex:1, borderRadius:6 }} />
                            <SyntaxHighlighter language="python" style={codeStyle} customStyle={{ fontSize:11, margin:0, borderRadius:8, background: 'var(--qs-inner-card-bg)' }}>{plan.test_template}</SyntaxHighlighter>
                          </div> },
                        plan.rollback_plan && { key:'rollback', label:<Text style={{ color:'#ffa502', fontSize:12 }}><UndoOutlined style={{ marginRight:4 }} />{isZh ? '回滚方案' : 'Rollback Plan'}</Text>,
                          children:<SyntaxHighlighter language="bash" style={codeStyle} customStyle={{ fontSize:11, margin:0, borderRadius:8, background: 'var(--qs-inner-card-bg)' }}>{plan.rollback_plan}</SyntaxHighlighter> },
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
          <ProCard title={<span><SafetyOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '合规映射' : 'Compliance Mapping'}</span>}
            className="qs-card" headerBorderless>
            <ProCard gutter={[10,10]} ghost wrap>
              {Object.entries(report.compliance_mapping).map(([k,v])=>(
                <ProCard key={k} colSpan={6} style={{
                  background:'var(--qs-inner-card-bg)', borderRadius:10,
                  borderLeft:`3px solid ${v.status==='NON_COMPLIANT'?'#ff4757':v.status==='COMPLIANT'?'#2ed573':'#ffa502'}`,
                }}>
                  <Tag color={v.status==='NON_COMPLIANT'?'red':v.status==='COMPLIANT'?'green':'orange'}
                    style={{ fontSize:10, marginBottom:6, borderRadius:4 }}>{v.status}</Tag>
                  <div style={{ color: 'var(--qs-inner-card-text)', fontSize:12, lineHeight:1.5 }}>{v.details}</div>
                  {v.deadline && <div style={{ color: colors.textDim, fontSize:10, marginTop:4 }}>Deadline: {v.deadline}</div>}
                </ProCard>
              ))}
            </ProCard>
          </ProCard>
        </motion.div>
      )}

      {/* ═══ Notes ═══ */}
      <motion.div variants={fadeUp}>
        <Alert
          message={<span style={{ fontWeight:600 }}>{isZh ? '迁移注意事项' : 'Migration Notes'}</span>}
          description={<ul style={{ margin:'8px 0', paddingLeft:20, color: 'var(--qs-inner-card-text3)', fontSize:13, lineHeight:1.8 }}>
            {isZh ? (<>
              <li>推荐 Hybrid 混合模式过渡 — Google / Cloudflare 主流方案</li>
              <li>PQC 密钥/签名尺寸较大 (ML-KEM-768 公钥 1,184 字节)，评估网络和存储影响</li>
              <li>使用 liboqs / Bouncy Castle / circl 等成熟库</li>
              <li>充分回归测试，生成 CBOM 并通过 CycloneDX 验证</li>
            </>) : (<>
              <li>Hybrid mode recommended — mainstream approach by Google / Cloudflare</li>
              <li>PQC keys/signatures are larger (ML-KEM-768 public key 1,184 bytes), assess network/storage impact</li>
              <li>Use mature libraries: liboqs / Bouncy Castle / circl</li>
              <li>Full regression testing, generate CBOM and validate with CycloneDX</li>
            </>)}
          </ul>}
          type="info" showIcon icon={<SafetyOutlined />}
          className="qs-alert-info"
        />
      </motion.div>
    </motion.div>
  );
}
