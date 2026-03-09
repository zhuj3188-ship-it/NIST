import React, { useState, useEffect } from 'react';
import { Row, Col, Tag, Typography, Space, Progress, Button, Spin, Alert, message } from 'antd';
import {
  AuditOutlined, SafetyOutlined, WarningOutlined, DownloadOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ThunderboltOutlined, ScanOutlined, ExperimentOutlined, LockOutlined,
} from '@ant-design/icons';
import { ProCard, StatisticCard, ProDescriptions } from '@ant-design/pro-components';
import { Liquid, Radar } from '@ant-design/plots';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { getScorecard, getCBOM, getSARIF, getComplianceReport, scanDemo } from '../lib/api';

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
  const [loading, setLoading] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const [cbom, setCbom] = useState(null);
  const [sarif, setSarif] = useState(null);
  const [compReport, setCompReport] = useState(null);

  const loadAll = async (sr) => {
    const t = sr||scanResult; if (!t?.id) return; setLoading(true);
    try {
      const [sc,cb,sa,cr] = await Promise.all([getScorecard(t.id), getCBOM(t.id), getSARIF(t.id), getComplianceReport(t.id)]);
      setScorecard(sc); setCbom(cb); setSarif(sa); setCompReport(cr);
    } catch(e){ message.error('加载合规数据失败'); }
    setLoading(false);
  };
  const runDemo = async () => { setLoading(true); try { const sr = await scanDemo(); await loadAll(sr); } catch(e){ message.error('Failed'); } setLoading(false); };
  useEffect(() => { if (scanResult?.id) loadAll(); }, [scanResult]);
  const dl = (data,name) => { const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); };

  /* ─── Empty state ─── */
  if (!scorecard && !loading) return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
      style={{ textAlign:'center', padding:'60px 20px' }}>
      <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        <AuditOutlined style={{ fontSize:80, color:'#6C5CE7', filter:'drop-shadow(0 0 24px rgba(108,92,231,0.4))', marginBottom:28, display:'block' }} />
      </motion.div>
      <Title level={3} className="gradient-text">合规报告与量子就绪度评估</Title>
      <Paragraph style={{ color:'#7a7a9e', maxWidth:560, margin:'0 auto 12px', lineHeight:1.8, fontSize:14 }}>
        Quantum Readiness Scorecard · CBOM (CycloneDX 1.6) · SARIF · NIST / CNSA / EU 合规映射
      </Paragraph>
      <Paragraph style={{ color:'#555577', maxWidth:480, margin:'0 auto 32px', fontSize:12 }}>
        对标 IBM Quantum-Safe Readiness Index 标准，自动映射 NIST IR 8547、CNSA 2.0、EU PQC 路线图。
      </Paragraph>
      <Space direction="vertical" size={12}>
        {scanResult?.id ? (
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={()=>loadAll()} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>生成合规报告</Button>
        ) : (<>
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={runDemo} loading={loading}
            className="qs-btn-gradient" style={{ height:48, paddingInline:32 }}>演示：扫描 + 合规报告</Button>
          <Button size="large" icon={<ScanOutlined />} onClick={()=>onNavigate?.('scanner')}
            style={{ borderColor:'rgba(108,92,231,0.4)', color:'#a29bfe' }}>先扫描代码</Button>
        </>)}
      </Space>
    </motion.div>
  );

  if (loading) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'60px 20px' }}>
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <AuditOutlined style={{ fontSize: 64, color: '#6C5CE7', filter: 'drop-shadow(0 0 20px rgba(108,92,231,0.5))', display: 'block', marginBottom: 24 }} />
      </motion.div>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <Text style={{ color: '#a29bfe', fontSize: 15, fontWeight: 600 }}>生成合规报告中...</Text>
        <div style={{ margin: '16px 0 8px', padding: '14px 20px', background: 'rgba(108,92,231,0.04)', borderRadius: 12, border: '1px solid rgba(108,92,231,0.1)' }}>
          <Row gutter={16}>
            {['Readiness Score', 'CBOM', 'SARIF', '合规映射'].map((s, i) => (
              <Col span={6} key={i} style={{ textAlign: 'center' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}>
                  <div style={{ fontSize: 20, color: '#6C5CE7', marginBottom: 4 }}>
                    {i === 0 && <SafetyOutlined />}{i === 1 && <FileTextOutlined />}{i === 2 && <FileTextOutlined />}{i === 3 && <AuditOutlined />}
                  </div>
                  <Text style={{ color: '#7a7a9e', fontSize: 11 }}>{s}</Text>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
        <Progress
          percent={65}
          status="active"
          strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
          trailColor="rgba(26,26,66,0.6)"
          strokeWidth={6}
          style={{ marginTop: 16 }}
        />
        <Text style={{ color: '#555577', fontSize: 12, display: 'block', marginTop: 8 }}>计算 Quantum Readiness Score · 生成 CBOM · SARIF · 合规映射...</Text>
      </div>
    </motion.div>
  );

  const dimLabels = { algorithm_safety:'算法安全性', key_strength:'密钥强度', crypto_agility:'密码敏捷性', compliance_readiness:'合规就绪度', exposure_risk:'暴露面风险' };
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
                <Title level={3} style={{ color:'#fff', margin:0 }}>Quantum Readiness Scorecard</Title>
              </Space>
              <Paragraph style={{ color:'#7a7a9e', margin:'6px 0 0', fontSize:13 }}>
                综合评估代码库在量子计算威胁下的安全态势 — 对标 IBM Quantum-Safe Readiness Index
              </Paragraph>
              {scorecard?.benchmark && (
                <div style={{ marginTop:14 }}>
                  <Tag style={{ borderRadius:6 }}>行业平均: {scorecard.benchmark.industry_avg}</Tag>
                  <Tag color="green" style={{ borderRadius:6 }}>前10%: {scorecard.benchmark.top_10_pct}</Tag>
                  <Tag color={scorecard.score>=scorecard.benchmark.top_10_pct?'green':'orange'} style={{ borderRadius:6 }}>您的得分: {scorecard.score}</Tag>
                </div>
              )}
            </div>
          </ProCard>
          <ProCard colSpan={8} className="qs-card"
            bodyStyle={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
            {scorecard && (
              <>
                <Liquid percent={scorecard.score/100} height={160}
                  shape="circle"
                  color={scorecard.score>=60?'#2ed573':scorecard.score>=40?'#ffa502':'#ff4757'}
                  outline={{ border:2, distance:4, style:{ stroke: scorecard.score>=60?'#2ed573':'#ff4757', strokeOpacity:0.4 } }}
                  wave={{ length:128 }}
                  statistic={{
                    title:{ content:'Readiness', style:{ fill:'#7a7a9e', fontSize:'11px' } },
                    content:{ content:`${scorecard.score}`, style:{ fill:'#fff', fontSize:'32px', fontWeight:800 } },
                  }}
                  theme="classicDark" />
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
          <ProCard colSpan={12} title={<><SafetyOutlined style={{ marginRight:8, color:'#6C5CE7' }} />评分维度分析</>}
            className="qs-card" headerBorderless>
            {radarData.length > 0 && (
              <Radar data={radarData} xField="item" yField="score" height={230}
                meta={{ score:{min:0,max:100} }}
                area={{ style:{fill:'rgba(108,92,231,0.2)'} }}
                point={{ size:3, style:{fill:'#6C5CE7', stroke:'#a29bfe', lineWidth:1} }}
                lineStyle={{ stroke:'#6C5CE7', lineWidth:2 }}
                xAxis={{ label:{style:{fill:'#8888aa',fontSize:11}}, grid:{line:{style:{stroke:'#1a1a42'}}} }}
                yAxis={{ label:false, grid:{line:{style:{stroke:'#1a1a42'}}} }}
                theme="classicDark" />
            )}
            {scorecard?.breakdown && Object.entries(scorecard.breakdown).map(([dim,val]) => (
              <div key={dim} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={{ color:'#ddd', fontSize:12 }}>{dimLabels[dim]}</Text>
                  <Text style={{ color:val>=70?'#2ed573':val>=40?'#ffa502':'#ff4757', fontWeight:700, fontSize:12 }}>{val}/100</Text>
                </div>
                <Progress percent={val} showInfo={false} strokeColor={val>=70?'#2ed573':val>=40?'#ffa502':'#ff4757'}
                  trailColor="rgba(26,26,66,0.6)" size="small" />
              </div>
            ))}
          </ProCard>
          <ProCard colSpan={12} title={<><WarningOutlined style={{ marginRight:8, color:'#ffa502' }} />安全建议</>}
            className="qs-card" headerBorderless>
            {scorecard?.recommendations?.map((r,i) => (
              <Alert key={i} message={<Text style={{ fontSize:13 }}>{r.text}</Text>}
                description={<Text style={{ color:'#7a7a9e', fontSize:12 }}>{r.action}</Text>}
                type={r.priority==='CRITICAL'?'error':r.priority==='HIGH'?'warning':'info'} showIcon
                style={{ marginBottom:8, background:'#060614', border:'1px solid var(--qs-border)', borderRadius:10 }} />
            ))}
          </ProCard>
        </ProCard>
      </motion.div>

      {/* ═══ Frameworks ═══ */}
      {compReport && (
        <motion.div variants={fadeUp}>
          <ProCard title={<><AuditOutlined style={{ marginRight:8, color:'#6C5CE7' }} />合规框架映射 — NIST IR 8547 · CNSA 2.0 · NCSC · EU PQC</>}
            extra={<Tag color={RC[compReport.overall_status]} style={{ fontSize:12, padding:'2px 14px', fontWeight:600, borderRadius:20 }}>{compReport.overall_status?.replace(/_/g,' ')}</Tag>}
            className="qs-card" headerBorderless>
            <ProCard gutter={[12,12]} ghost wrap>
              {compReport.frameworks?.map((fw,i) => (
                <ProCard key={i} colSpan={12} style={{
                  background:'#060614', borderRadius:12,
                  border:`1px solid ${['COMPLIANT','ON_TRACK'].includes(fw.status)?'rgba(46,213,115,0.2)':['NON_COMPLIANT','AT_RISK'].includes(fw.status)?'rgba(255,71,87,0.2)':'rgba(255,165,2,0.2)'}`,
                }}>
                  <Space direction="vertical" style={{ width:'100%' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <Text strong style={{ color:'#fff', fontSize:13 }}>{SI[fw.status]} <span style={{ marginLeft:6 }}>{fw.name}</span></Text>
                    </div>
                    <div>
                      <Tag color={RC[fw.status]} style={{ borderRadius:4 }}>{fw.status}</Tag>
                      {fw.deadline && <Tag style={{ borderRadius:4 }}>截止: {fw.deadline}</Tag>}
                      <Tag color="red" style={{ borderRadius:4 }}>{fw.findings_count} 个发现</Tag>
                    </div>
                    {fw.recommendation && <Text style={{ color:'#7a7a9e', fontSize:12 }}>{fw.recommendation}</Text>}
                    {fw.requirements?.map((req,j) => (
                      <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                        <Text style={{ color:'#ddd', fontSize:12 }}>{req.algo} ({req.purpose})</Text>
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
            extra={cbom && <Button icon={<DownloadOutlined />} size="small" onClick={()=>dl(cbom,'cbom.json')} style={{ borderColor:'var(--qs-border)', borderRadius:8 }}>导出 JSON</Button>}
            className="qs-card" headerBorderless>
            {cbom ? (
              <div>
                <ProDescriptions column={2} size="small" labelStyle={{ color:'#7a7a9e', fontSize:11 }} contentStyle={{ color:'#ddd', fontSize:11 }}>
                  <ProDescriptions.Item label="格式">{cbom.bomFormat}</ProDescriptions.Item>
                  <ProDescriptions.Item label="版本">{cbom.specVersion}</ProDescriptions.Item>
                  <ProDescriptions.Item label="组件数">{cbom.components?.length||0}</ProDescriptions.Item>
                  <ProDescriptions.Item label="项目">{cbom.metadata?.component?.name}</ProDescriptions.Item>
                </ProDescriptions>
                <div style={{ marginTop:10 }}>
                  <Text style={{ color:'#7a7a9e', fontSize:12, display:'block', marginBottom:6 }}>密码学资产清单:</Text>
                  {cbom.components?.slice(0,8).map((c,i) => (
                    <div key={i} style={{ padding:'4px 0', borderBottom:'1px solid rgba(26,26,66,0.4)' }}>
                      <Tag color="blue" style={{ fontSize:10, borderRadius:4 }}>{c.name}</Tag>
                      {c.properties?.find(p=>p.name==='quantumRisk') && <Tag className={`tag-${c.properties.find(p=>p.name==='quantumRisk').value.toLowerCase()}`} style={{ fontSize:10 }}>{c.properties.find(p=>p.name==='quantumRisk').value}</Tag>}
                      {c.properties?.find(p=>p.name==='migrationTarget')?.value && <><span style={{ color:'#4a4a6e', margin:'0 4px' }}>→</span><Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{c.properties.find(p=>p.name==='migrationTarget').value}</Tag></>}
                    </div>
                  ))}
                </div>
              </div>
            ) : <Text style={{ color:'#4a4a6e' }}>暂无数据</Text>}
          </ProCard>
          <ProCard colSpan={12} title={<><FileTextOutlined style={{ marginRight:8, color:'#6C5CE7' }} />SARIF 报告</>}
            extra={sarif && <Button icon={<DownloadOutlined />} size="small" onClick={()=>dl(sarif,'quantum-findings.sarif')} style={{ borderColor:'var(--qs-border)', borderRadius:8 }}>导出</Button>}
            className="qs-card" headerBorderless>
            {sarif ? (
              <div>
                <ProDescriptions column={2} size="small" labelStyle={{ color:'#7a7a9e', fontSize:11 }} contentStyle={{ color:'#ddd', fontSize:11 }}>
                  <ProDescriptions.Item label="Schema">SARIF 2.1.0</ProDescriptions.Item>
                  <ProDescriptions.Item label="工具">{sarif.runs?.[0]?.tool?.driver?.name}</ProDescriptions.Item>
                  <ProDescriptions.Item label="规则数">{sarif.runs?.[0]?.tool?.driver?.rules?.length||0}</ProDescriptions.Item>
                  <ProDescriptions.Item label="结果数">{sarif.runs?.[0]?.results?.length||0}</ProDescriptions.Item>
                </ProDescriptions>
                <div style={{ marginTop:10 }}>
                  {sarif.runs?.[0]?.results?.slice(0,6).map((r,i) => (
                    <div key={i} style={{ padding:'4px 0', borderBottom:'1px solid rgba(26,26,66,0.4)' }}>
                      <Tag color={r.level==='error'?'red':r.level==='warning'?'orange':'blue'} style={{ fontSize:10, borderRadius:4 }}>{r.level}</Tag>
                      <Text style={{ color:'#ddd', fontSize:11 }}>{r.message?.text?.substring(0,80)}</Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Text style={{ color:'#4a4a6e' }}>暂无数据</Text>}
          </ProCard>
        </ProCard>
      </motion.div>
    </motion.div>
  );
}
