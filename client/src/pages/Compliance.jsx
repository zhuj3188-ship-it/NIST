import React, { useState, useEffect } from 'react';
import { Row, Col, Tag, Typography, Space, Progress, Button, Spin, Alert, message } from 'antd';
import {
  AuditOutlined, SafetyOutlined, WarningOutlined, DownloadOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ThunderboltOutlined, ScanOutlined, ExperimentOutlined, LockOutlined,
} from '@ant-design/icons';
import { ProCard, StatisticCard, ProDescriptions } from '@ant-design/pro-components';
import { Radar } from '@ant-design/plots';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { getScorecard, getCBOM, getSARIF, getComplianceReport, scanDemo } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Title, Text, Paragraph } = Typography;
const { Divider } = StatisticCard;
const RC = { COMPLIANT:'#2ed573', NON_COMPLIANT:'#ff4757', PARTIAL:'#ffa502', PARTIAL_COMPLIANT:'#ffa502', AT_RISK:'#ff4757', ON_TRACK:'#2ed573', OK:'#2ed573', MISSING:'#ff4757', UPGRADE_NEEDED:'#ffa502', CRITICAL_NON_COMPLIANT:'#ff4757' };
const SI = {
  COMPLIANT:<CheckCircleOutlined style={{ color:'#2ed573' }} />,
  NON_COMPLIANT:<CloseCircleOutlined style={{ color:'#ff4757' }} />,
  PARTIAL:<ExclamationCircleOutlined style={{ color:'#ffa502' }} />,
  PARTIAL_COMPLIANT:<ExclamationCircleOutlined style={{ color:'#ffa502' }} />,
  AT_RISK:<WarningOutlined style={{ color:'#ff4757' }} />,
  ON_TRACK:<CheckCircleOutlined style={{ color:'#2ed573' }} />,
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function Compliance({ scanResult, onNavigate }) {
  const { isDark, colors } = useTheme();
  const { t, lang } = useI18n();
  const isZh = lang === 'zh';
  const [loading, setLoading] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const [cbom, setCbom] = useState(null);
  const [sarif, setSarif] = useState(null);
  const [compReport, setCompReport] = useState(null);

  const trailColor = isDark ? 'rgba(26,26,66,0.6)' : '#f0f0f5';
  const gridColor = isDark ? '#1a1a42' : '#e8e8f0';
  const labelColor = isDark ? '#8888aa' : '#666680';
  const chartTheme = isDark ? 'classicDark' : 'classic';

  const loadAll = async (sr) => {
    const tgt = sr||scanResult; if (!tgt?.id) return; setLoading(true);
    const t_id = tgt.id;
    try {
      const [sc,cb,sa,cr] = await Promise.all([getScorecard(t_id), getCBOM(t_id), getSARIF(t_id), getComplianceReport(t_id)]);
      setScorecard(sc); setCbom(cb); setSarif(sa); setCompReport(cr);
    } catch(e){ message.error(t('comp.load_failed')); }
    setLoading(false);
  };
  const runDemo = async () => { setLoading(true); try { const sr = await scanDemo(); await loadAll(sr); } catch(e){ message.error('Failed'); } setLoading(false); };
  useEffect(() => { if (scanResult?.id) loadAll(); }, [scanResult]);
  const dl = (data,name) => { const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); };

  /* ─── Empty state ─── */
  if (!scorecard && !loading) return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
      style={{ textAlign:'center', padding:'40px 20px' }}>
      <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        <AuditOutlined style={{ fontSize:60, color:'#6C5CE7', filter:'drop-shadow(0 0 16px rgba(108,92,231,0.3))', marginBottom:20, display:'block' }} />
      </motion.div>
      <Title level={3} className="gradient-text">{t('comp.empty_title')}</Title>
      <Paragraph style={{ color: colors.textSecondary, maxWidth:560, margin:'0 auto 12px', lineHeight:1.8, fontSize:14 }}>
        {t('comp.empty_desc')}
      </Paragraph>
      <Paragraph style={{ color: colors.textDim, maxWidth:480, margin:'0 auto 24px', fontSize:12 }}>
        {t('comp.empty_sub')}
      </Paragraph>
      <Space direction="vertical" size={12}>
        {scanResult?.id ? (
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={()=>loadAll()} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>{t('comp.generate')}</Button>
        ) : (<>
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={runDemo} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>{t('comp.demo_compliance')}</Button>
          <Button size="large" icon={<ScanOutlined />} onClick={()=>onNavigate?.('scanner')}
            style={{ borderColor:'rgba(108,92,231,0.4)', color: colors.accent }}>{t('comp.scan_first')}</Button>
        </>)}
      </Space>
    </motion.div>
  );

  if (loading) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'40px 20px' }}>
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <AuditOutlined style={{ fontSize: 48, color: '#6C5CE7', filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.4))', display: 'block', marginBottom: 20 }} />
      </motion.div>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Text style={{ color: colors.accent, fontSize: 15, fontWeight: 600 }}>{t('comp.loading')}</Text>
        <div style={{ margin: '16px 0 8px', padding: '14px 20px', background: isDark ? 'rgba(108,92,231,0.04)' : 'rgba(108,92,231,0.03)', borderRadius: 12, border: `1px solid ${isDark ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.08)'}` }}>
          <Row gutter={16}>
            {['Readiness Score', 'CBOM', 'SARIF', isZh ? '合规映射' : 'Compliance'].map((s, i) => (
              <Col span={6} key={i} style={{ textAlign: 'center' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}>
                  <div style={{ fontSize: 20, color: '#6C5CE7', marginBottom: 4 }}>
                    {i === 0 && <SafetyOutlined />}{i === 1 && <FileTextOutlined />}{i === 2 && <FileTextOutlined />}{i === 3 && <AuditOutlined />}
                  </div>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{s}</Text>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
        <Progress
          percent={65} status="active"
          strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
          trailColor={trailColor} strokeWidth={6} style={{ marginTop: 16 }}
        />
        <Text style={{ color: colors.textDim, fontSize: 12, display: 'block', marginTop: 8 }}>{t('comp.loading_sub')}</Text>
      </div>
    </motion.div>
  );

  const dimLabels = { algorithm_safety: t('comp.algorithm_safety'), key_strength: t('comp.key_strength'), crypto_agility: t('comp.crypto_agility'), compliance_readiness: t('comp.compliance_readiness'), exposure_risk: t('comp.exposure_risk') };
  const radarData = scorecard?.breakdown ? Object.entries(scorecard.breakdown).map(([k,v]) => ({ item: dimLabels[k]||k, score: v })) : [];

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden:{}, visible:{ transition:{ staggerChildren:0.08 }} }}
      style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Scorecard Hero ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard gutter={16} ghost>
          <ProCard colSpan={16} className="hero-gradient"
            bodyStyle={{ position:'relative', overflow:'hidden', zIndex:1 }}>
            <div style={{ position:'relative', zIndex:2 }}>
              <Space align="center" style={{ marginBottom:10 }}>
                <ExperimentOutlined style={{ fontSize:24, color:'#6C5CE7' }} />
                <Title level={3} style={{ color: colors.text, margin:0 }}>Quantum Readiness Scorecard</Title>
              </Space>
              <Paragraph style={{ color: colors.textSecondary, margin:'6px 0 0', fontSize:13 }}>
                {isZh ? '综合评估代码库在量子计算威胁下的安全态势 — 对标 IBM Quantum-Safe Readiness Index' : 'Comprehensive assessment of code security posture against quantum computing threats — benchmarked against IBM Quantum-Safe Readiness Index'}
              </Paragraph>
              {scorecard?.benchmark && (
                <div style={{ marginTop:14 }}>
                  <Tag style={{ borderRadius:6 }}>{isZh ? '行业平均' : 'Industry Avg'}: {scorecard.benchmark.industry_avg}</Tag>
                  <Tag color="green" style={{ borderRadius:6 }}>{isZh ? '前10%' : 'Top 10%'}: {scorecard.benchmark.top_10_pct}</Tag>
                  <Tag color={scorecard.score>=scorecard.benchmark.top_10_pct?'green':'orange'} style={{ borderRadius:6 }}>{isZh ? '您的得分' : 'Your Score'}: {scorecard.score}</Tag>
                </div>
              )}
            </div>
          </ProCard>
          <ProCard colSpan={8} className="qs-card"
            bodyStyle={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
            {scorecard && (
              <>
                <Progress type="dashboard" percent={scorecard.score} size={160} strokeWidth={10}
                  strokeColor={{ '0%': scorecard.score>=60?'#52c41a':'#ff4757', '100%': scorecard.score>=60?'#2ed573':'#ff6b35' }}
                  format={() => (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:32, fontWeight:800, color: colors.text, lineHeight:1 }}>{scorecard.score}</div>
                      <div style={{ fontSize:11, color: colors.textSecondary, marginTop:4 }}>Readiness</div>
                    </div>
                  )} />
                <Tag color={scorecard.grade==='F'?'red':scorecard.grade==='D'?'orange':scorecard.grade==='C'?'gold':'green'}
                  style={{ fontSize:14, padding:'4px 20px', fontWeight:600, marginTop:10, borderRadius:20 }}>{scorecard.grade} — {scorecard.label}</Tag>
              </>
            )}
          </ProCard>
        </ProCard>
      </motion.div>

      {/* ═══ Risk Summary ═══ */}
      {scorecard?.risk_summary && (
        <motion.div variants={fadeUp}>
          <StatisticCard.Group direction="row" style={{ borderRadius:12, overflow:'hidden' }}>
            <StatisticCard statistic={{ title:'CRITICAL', value:scorecard.risk_summary.critical, valueStyle:{color:'#ff4757'}, icon:<CloseCircleOutlined style={{color:'#ff4757'}} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title:'HIGH', value:scorecard.risk_summary.high, valueStyle:{color:'#ff6b35'}, icon:<WarningOutlined style={{color:'#ff6b35'}} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title:'MEDIUM', value:scorecard.risk_summary.medium, valueStyle:{color:'#ffa502'}, icon:<ExclamationCircleOutlined style={{color:'#ffa502'}} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title:'LOW', value:scorecard.risk_summary.low, valueStyle:{color:'#2ed573'}, icon:<CheckCircleOutlined style={{color:'#2ed573'}} /> }} />
          </StatisticCard.Group>
        </motion.div>
      )}

      {/* ═══ Radar + Recommendations ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard gutter={16} ghost>
          <ProCard colSpan={12} title={<><SafetyOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '评分维度分析' : 'Score Breakdown'}</>}
            className="qs-card" headerBorderless>
            {radarData.length > 0 && (
              <Radar data={radarData} xField="item" yField="score" height={230}
                meta={{ score:{min:0,max:100} }}
                area={{ style:{fill:'rgba(108,92,231,0.2)'} }}
                point={{ size:3, style:{fill:'#6C5CE7', stroke:'#a29bfe', lineWidth:1} }}
                lineStyle={{ stroke:'#6C5CE7', lineWidth:2 }}
                xAxis={{ label:{style:{fill: labelColor,fontSize:11}}, grid:{line:{style:{stroke: gridColor}}} }}
                yAxis={{ label:false, grid:{line:{style:{stroke: gridColor}}} }}
                theme={chartTheme} />
            )}
            {scorecard?.breakdown && Object.entries(scorecard.breakdown).map(([dim,val]) => (
              <div key={dim} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ color: colors.text, fontSize:12 }}>{dimLabels[dim]}</Text>
                  <Text style={{ color:val>=70?'#2ed573':val>=40?'#ffa502':'#ff4757', fontWeight:700, fontSize:12 }}>{val}/100</Text>
                </div>
                <Progress percent={val} showInfo={false} strokeColor={val>=70?'#2ed573':val>=40?'#ffa502':'#ff4757'}
                  trailColor={trailColor} size="small" />
              </div>
            ))}
          </ProCard>
          <ProCard colSpan={12} title={<><WarningOutlined style={{ marginRight:8, color:'#ffa502' }} />{isZh ? '安全建议' : 'Recommendations'}</>}
            className="qs-card" headerBorderless>
            {scorecard?.recommendations?.map((r,i) => (
              <Alert key={i} message={<Text style={{ fontSize:13 }}>{r.text}</Text>}
                description={<Text style={{ color: colors.textSecondary, fontSize:12 }}>{r.action}</Text>}
                type={r.priority==='CRITICAL'?'error':r.priority==='HIGH'?'warning':'info'} showIcon
                style={{ marginBottom:8, background:'var(--qs-inner-card-bg)', border:'1px solid var(--qs-border)', borderRadius:10 }} />
            ))}
          </ProCard>
        </ProCard>
      </motion.div>

      {/* ═══ Frameworks ═══ */}
      {compReport && (
        <motion.div variants={fadeUp}>
          <ProCard title={<><AuditOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{isZh ? '合规框架映射 — NIST IR 8547 · CNSA 2.0 · NCSC · EU PQC' : 'Compliance Framework Mapping — NIST IR 8547 · CNSA 2.0 · NCSC · EU PQC'}</>}
            extra={<Tag color={RC[compReport.overall_status]} style={{ fontSize:12, padding:'2px 14px', fontWeight:600, borderRadius:20 }}>{compReport.overall_status?.replace(/_/g,' ')}</Tag>}
            className="qs-card" headerBorderless>
            <ProCard gutter={[12,12]} ghost wrap>
              {compReport.frameworks?.map((fw,i) => (
                <ProCard key={i} colSpan={12} style={{
                  background:'var(--qs-inner-card-bg)', borderRadius:12,
                  border:`1px solid ${['COMPLIANT','ON_TRACK'].includes(fw.status)?'rgba(46,213,115,0.2)':['NON_COMPLIANT','AT_RISK'].includes(fw.status)?'rgba(255,71,87,0.2)':'rgba(255,165,2,0.2)'}`,
                }}>
                  <Space direction="vertical" style={{ width:'100%' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <Text strong style={{ color: colors.text, fontSize:13 }}>{SI[fw.status]} <span style={{ marginLeft:6 }}>{fw.name}</span></Text>
                    </div>
                    <div>
                      <Tag color={RC[fw.status]} style={{ borderRadius:4 }}>{fw.status}</Tag>
                      {fw.deadline && <Tag style={{ borderRadius:4 }}>{isZh ? '截止' : 'Deadline'}: {fw.deadline}</Tag>}
                      <Tag color="red" style={{ borderRadius:4 }}>{fw.findings_count} {isZh ? '个发现' : 'findings'}</Tag>
                    </div>
                    {fw.recommendation && <Text style={{ color: colors.textSecondary, fontSize:12 }}>{fw.recommendation}</Text>}
                    {fw.requirements?.map((req,j) => (
                      <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                        <Text style={{ color: 'var(--qs-inner-card-text)', fontSize:12 }}>{req.algo} ({req.purpose})</Text>
                        <Tag color={RC[req.status]} style={{ fontSize:10, borderRadius:4 }}>{req.status}</Tag>
                      </div>
                    ))}
                  </Space>
                </ProCard>
              ))}
            </ProCard>
          </ProCard>
        </motion.div>
      )}

      {/* ═══ CBOM & SARIF ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard gutter={16} ghost>
          <ProCard colSpan={12} title={<><FileTextOutlined style={{ marginRight:8, color:'#6C5CE7' }} />CBOM — CycloneDX 1.6</>}
            extra={cbom && <Button icon={<DownloadOutlined />} size="small" onClick={()=>dl(cbom,'cbom.json')} style={{ borderColor:'var(--qs-border)', borderRadius:8 }}>{isZh ? '导出 JSON' : 'Export JSON'}</Button>}
            className="qs-card" headerBorderless>
            {cbom ? (
              <div>
                <ProDescriptions column={2} size="small" labelStyle={{ color: colors.textSecondary, fontSize:11 }} contentStyle={{ color: 'var(--qs-inner-card-text)', fontSize:11 }}>
                  <ProDescriptions.Item label={isZh ? '格式' : 'Format'}>{cbom.bomFormat}</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '版本' : 'Version'}>{cbom.specVersion}</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '组件数' : 'Components'}>{cbom.components?.length||0}</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '项目' : 'Project'}>{cbom.metadata?.component?.name}</ProDescriptions.Item>
                </ProDescriptions>
                <div style={{ marginTop:10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize:12, display:'block', marginBottom:6 }}>{isZh ? '密码学资产清单' : 'Cryptographic Asset Inventory'}:</Text>
                  {cbom.components?.slice(0,8).map((c,i) => (
                    <div key={i} style={{ padding:'4px 0', borderBottom:`1px solid var(--qs-border)` }}>
                      <Tag color="blue" style={{ fontSize:10, borderRadius:4 }}>{c.name}</Tag>
                      {c.properties?.find(p=>p.name==='quantumRisk') && <Tag className={`tag-${c.properties.find(p=>p.name==='quantumRisk').value.toLowerCase()}`} style={{ fontSize:10 }}>{c.properties.find(p=>p.name==='quantumRisk').value}</Tag>}
                      {c.properties?.find(p=>p.name==='migrationTarget')?.value && <><span style={{ color: colors.textDim, margin:'0 4px' }}>→</span><Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{c.properties.find(p=>p.name==='migrationTarget').value}</Tag></>}
                    </div>
                  ))}
                </div>
              </div>
            ) : <Text style={{ color: colors.textDim }}>{isZh ? '暂无数据' : 'No data yet'}</Text>}
          </ProCard>
          <ProCard colSpan={12} title={<><FileTextOutlined style={{ marginRight:8, color:'#6C5CE7' }} />SARIF {isZh ? '报告' : 'Report'}</>}
            extra={sarif && <Button icon={<DownloadOutlined />} size="small" onClick={()=>dl(sarif,'quantum-findings.sarif')} style={{ borderColor:'var(--qs-border)', borderRadius:8 }}>{isZh ? '导出' : 'Export'}</Button>}
            className="qs-card" headerBorderless>
            {sarif ? (
              <div>
                <ProDescriptions column={2} size="small" labelStyle={{ color: colors.textSecondary, fontSize:11 }} contentStyle={{ color: 'var(--qs-inner-card-text)', fontSize:11 }}>
                  <ProDescriptions.Item label="Schema">SARIF 2.1.0</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '工具' : 'Tool'}>{sarif.runs?.[0]?.tool?.driver?.name}</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '规则数' : 'Rules'}>{sarif.runs?.[0]?.tool?.driver?.rules?.length||0}</ProDescriptions.Item>
                  <ProDescriptions.Item label={isZh ? '结果数' : 'Results'}>{sarif.runs?.[0]?.results?.length||0}</ProDescriptions.Item>
                </ProDescriptions>
                <div style={{ marginTop:10 }}>
                  {sarif.runs?.[0]?.results?.slice(0,6).map((r,i) => (
                    <div key={i} style={{ padding:'4px 0', borderBottom:`1px solid var(--qs-border)` }}>
                      <Tag color={r.level==='error'?'red':r.level==='warning'?'orange':'blue'} style={{ fontSize:10, borderRadius:4 }}>{r.level}</Tag>
                      <Text style={{ color: 'var(--qs-inner-card-text)', fontSize:11 }}>{r.message?.text?.substring(0,80)}</Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Text style={{ color: colors.textDim }}>{isZh ? '暂无数据' : 'No data yet'}</Text>}
          </ProCard>
        </ProCard>
      </motion.div>
    </motion.div>
  );
}
