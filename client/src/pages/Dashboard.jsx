import React, { useState, useCallback, useEffect } from 'react';
import { Row, Col, Progress, Tag, Timeline, Button, Typography, Space, Alert, Tooltip, Spin } from 'antd';
import {
  BugOutlined, FileSearchOutlined, ThunderboltOutlined, WarningOutlined,
  ClockCircleOutlined, ExperimentOutlined, ScanOutlined, ArrowRightOutlined,
  DashboardOutlined, AuditOutlined, AlertOutlined, FundOutlined,
  ApiOutlined, FireOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { StatisticCard, ProCard } from '@ant-design/pro-components';
import { Pie, Column, Radar, Tiny } from '@ant-design/plots';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { scanDemo, getScorecard, getRiskAnalysis } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Text, Paragraph } = Typography;
const { Statistic, Divider } = StatisticCard;
const RCQ = { CRITICAL: '#ff4757', HIGH: '#ff6b35', MEDIUM: '#ffa502', LOW: '#2ed573', SAFE: '#1e90ff' };

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };

const SCAN_STEPS = [
  { label: 'Initialize', pct: 5 },
  { label: 'Load rules (150+)', pct: 15 },
  { label: 'Parse AST', pct: 30 },
  { label: 'Regex matching', pct: 50 },
  { label: 'Dependency analysis', pct: 60 },
  { label: 'Risk scoring', pct: 75 },
  { label: 'Generate scorecard', pct: 85 },
  { label: 'Complete', pct: 100 },
];

export default function Dashboard({ onNavigate, setScanResult }) {
  const { isDark, colors } = useTheme();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState('');

  const runDemo = useCallback(async () => {
    setLoading(true); setScanProgress(0); setScanStep(SCAN_STEPS[0].label);
    let stepIdx = 0;
    const iv = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, SCAN_STEPS.length - 2);
      setScanProgress(SCAN_STEPS[stepIdx].pct);
      setScanStep(SCAN_STEPS[stepIdx].label);
    }, 350);
    try {
      const r = await scanDemo();
      setResult(r); setScanResult?.(r);
      setScanProgress(75); setScanStep(SCAN_STEPS[5].label);
      const [sc, rd] = await Promise.all([getScorecard(r.id), getRiskAnalysis(r.id)]);
      setScorecard(sc); setRiskData(rd);
      setScanProgress(100); setScanStep(SCAN_STEPS[7].label);
    } catch (e) { console.error(e); }
    clearInterval(iv);
    setTimeout(() => setLoading(false), 500);
  }, [setScanResult]);

  const f = result?.findings || [];
  const byRisk = result?.summary?.by_risk || {};
  const byAlgo = result?.summary?.by_algorithm || {};
  const summary = riskData?.executive_summary;
  const hndl = riskData?.hndl_analysis;
  const matrix = riskData?.risk_matrix;
  const bi = riskData?.business_impact;

  const riskPieData = result ? Object.entries(byRisk).filter(([,v]) => v > 0).map(([k,v]) => ({ type: k, value: v })) : [];
  const algBarData = result ? Object.entries(byAlgo).sort((a,b) => b[1]-a[1]).slice(0,10).map(([k,v]) => ({ algo: k, count: v })) : [];
  const radarData = scorecard?.breakdown ? Object.entries(scorecard.breakdown).map(([k,v]) => {
    const m = { algorithm_safety: t('comp.algorithm_safety'), key_strength: t('comp.key_strength'), crypto_agility: t('comp.crypto_agility'), compliance_readiness: t('comp.compliance_readiness'), exposure_risk: t('comp.exposure_risk') };
    return { item: m[k]||k, score: v };
  }) : [];
  const trendData = riskData?.trend_data?.map(d => d.score) || [];
  const trailColor = isDark ? 'rgba(26,26,66,0.6)' : '#f0f0f5';
  const chartTheme = isDark ? 'classicDark' : 'classic';
  const gridColor = isDark ? '#1a1a42' : '#e8e8f0';
  const labelColor = isDark ? '#8888aa' : '#666680';

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══ Hero ═══ */}
      <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
        <ProCard gutter={[16, 16]} ghost>
          <ProCard colSpan={scorecard ? 16 : 24} className="hero-gradient"
            bodyStyle={{ position: 'relative', overflow: 'hidden', zIndex: 1 }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <Space align="center" style={{ marginBottom: 10 }}>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                  <ExperimentOutlined style={{ fontSize: 30, color: '#6C5CE7', filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.5))' }} />
                </motion.div>
                <span className="gradient-text" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t('dash.title')}</span>
                <Tag style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.4)', color: '#a29bfe', fontSize: 10, fontWeight: 600 }}>Enterprise v2.2</Tag>
              </Space>
              <Paragraph style={{ color: colors.textSecondary, margin: '6px 0 20px', fontSize: 14, maxWidth: 640, lineHeight: 1.8 }}>
                {t('dash.subtitle')}
                <br />
                <Text style={{ color: colors.textDim, fontSize: 12 }}>{t('dash.lang_support')}</Text>
              </Paragraph>

              {loading && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Spin size="small" />
                    <Text style={{ color: '#a29bfe', fontSize: 13, fontWeight: 500 }}>{scanStep}</Text>
                    <Text style={{ color: colors.textDim, fontSize: 12, marginLeft: 'auto' }}>{scanProgress}%</Text>
                  </div>
                  <Progress percent={scanProgress} showInfo={false}
                    strokeColor={{ '0%': '#6C5CE7', '50%': '#a29bfe', '100%': '#2ed573' }}
                    trailColor={trailColor} strokeWidth={6} />
                </motion.div>
              )}

              <Space size={12}>
                <Button type="primary" size="large" icon={<ThunderboltOutlined />} loading={loading} onClick={runDemo}
                  className="qs-btn-gradient" style={{ height: 46, paddingInline: 32, fontSize: 14 }}>
                  {loading ? t('dash.scanning') : t('dash.scan_demo')}
                </Button>
                <Button size="large" icon={<ScanOutlined />} onClick={() => onNavigate?.('scanner')}
                  style={{ height: 46, borderColor: 'rgba(108,92,231,0.4)', color: '#a29bfe', background: 'rgba(108,92,231,0.06)' }}>
                  {t('dash.scan_my_code')}
                </Button>
                <Button size="large" icon={<AuditOutlined />} onClick={() => onNavigate?.('compliance')}
                  style={{ height: 46, borderColor: isDark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.3)', color: colors.textSecondary }}>
                  {t('dash.compliance_report')}
                </Button>
              </Space>
            </div>
          </ProCard>
          {scorecard && (
            <ProCard colSpan={8} className="qs-card"
              bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
              <Progress type="dashboard" percent={scorecard.score} size={160} strokeWidth={10}
                strokeColor={{ '0%': scorecard.score >= 60 ? '#52c41a' : '#ff4757', '100%': scorecard.score >= 60 ? '#2ed573' : '#ff6b35' }}
                format={() => (
                  <div>
                    <div style={{ fontSize: 42, fontWeight: 800, color: colors.text, lineHeight: 1 }}><CountUp end={scorecard.score} duration={1.5} /></div>
                    <div style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>Readiness</div>
                  </div>
                )} />
              <Tag color={scorecard.grade==='F'?'red':scorecard.grade==='D'?'orange':'green'}
                style={{ marginTop: 12, fontWeight: 600, fontSize: 14, padding: '4px 24px', borderRadius: 20 }}>
                {scorecard.grade} — {scorecard.label}
              </Tag>
            </ProCard>
          )}
        </ProCard>
      </motion.div>

      {/* ═══ HNDL Alert ═══ */}
      <motion.div variants={fadeUp}>
        {hndl?.vulnerable_encryption_points > 0 ? (
          <Alert
            message={<span style={{ fontWeight: 700 }}><FireOutlined style={{ marginRight: 8 }} />{t('dash.hndl_title')}</span>}
            description={
              <span>
                {lang === 'zh' ? '检测到 ' : 'Detected '}<strong style={{ color: '#ff4757' }}>{hndl.vulnerable_encryption_points}</strong>{t('dash.hndl_detect')}
                {lang === 'zh' ? '预计还剩 ' : ' Est. '}<strong style={{ color: '#ffa502' }}>{hndl.years_remaining} {t('dash.hndl_years')}</strong>。
                {lang === 'zh' ? '受影响算法: ' : ' Affected: '}{hndl.affected_algorithms?.map((a,i) => <Tag key={i} color="red" style={{ fontSize: 10 }}>{a}</Tag>)}
              </span>
            }
            type="error" showIcon icon={<WarningOutlined />} className="qs-alert-critical"
          />
        ) : !result && !loading ? (
          <Alert
            message={<span style={{ fontWeight: 600 }}>Harvest Now, Decrypt Later (HNDL)</span>}
            description={t('dash.hndl_desc')}
            type="error" showIcon icon={<WarningOutlined />} className="qs-alert-critical"
          />
        ) : null}
      </motion.div>

      {/* ═══ Executive Summary ═══ */}
      {summary && (
        <motion.div variants={fadeUp}>
          <ProCard className="qs-card" bodyStyle={{ padding: '20px 24px' }}>
            <Row gutter={16} align="middle">
              <Col flex="64px">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14,
                    background: riskData.overall_risk_score >= 60 ? 'rgba(255,71,87,0.12)' : 'rgba(46,213,115,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${riskData.overall_risk_score >= 60 ? 'rgba(255,71,87,0.3)' : 'rgba(46,213,115,0.3)'}`,
                  }}>
                    <AlertOutlined style={{ fontSize: 24, color: riskData.overall_risk_score >= 60 ? '#ff4757' : '#2ed573' }} />
                  </div>
                </motion.div>
              </Col>
              <Col flex="auto">
                <Text style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}>{summary.headline}</Text>
                <div style={{ marginTop: 6 }}>
                  {summary.key_findings?.slice(0,3).map((kf,i) => (
                    <Text key={i} style={{ color: colors.textSecondary, fontSize: 12, display: 'block', lineHeight: 1.6 }}>• {kf}</Text>
                  ))}
                </div>
              </Col>
              <Col>
                <div style={{ textAlign: 'center', padding: '0 16px' }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: riskData.overall_risk_score >= 60 ? '#ff4757' : '#2ed573', lineHeight: 1 }}>
                    <CountUp end={riskData.overall_risk_score} duration={1.5} />
                  </div>
                  <Tag color={riskData.risk_level==='CRITICAL'?'red':riskData.risk_level==='HIGH'?'orange':'green'}
                    style={{ marginTop: 6, fontSize: 11 }}>{t('dash.risk_level')}: {riskData.risk_level}</Tag>
                </div>
              </Col>
              {trendData.length > 0 && (
                <Col flex="130px">
                  <Tiny.Line data={trendData} height={50} width={120} smooth shapeField="smooth"
                    style={{ stroke: '#6C5CE7', lineWidth: 2 }} axis={false} />
                </Col>
              )}
            </Row>
          </ProCard>
        </motion.div>
      )}

      {/* ═══ Stats Row ═══ */}
      {result && (
        <motion.div variants={fadeUp}>
          <StatisticCard.Group direction="row" style={{ borderRadius: 12, overflow: 'hidden' }}>
            <StatisticCard statistic={{ title: t('dash.files_scanned'), value: result.total_files, icon: <FileSearchOutlined style={{ color: '#6C5CE7' }} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title: t('dash.total_findings'), value: result.summary.total_findings, valueStyle: { color: '#ff4757' }, icon: <BugOutlined style={{ color: '#ff4757' }} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title: 'CRITICAL', value: byRisk.CRITICAL||0, valueStyle: { color: '#ff4757' }, icon: <WarningOutlined style={{ color: '#ff4757' }} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title: 'HIGH', value: byRisk.HIGH||0, valueStyle: { color: '#ff6b35' }, icon: <WarningOutlined style={{ color: '#ff6b35' }} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title: t('dash.scan_duration'), value: result.scan_duration_ms, suffix: 'ms', icon: <ClockCircleOutlined style={{ color: '#2ed573' }} /> }} />
            <Divider type="vertical" />
            <StatisticCard statistic={{ title: t('dash.code_lines'), value: result.total_lines, icon: <FileSearchOutlined style={{ color: '#1e90ff' }} /> }} />
          </StatisticCard.Group>
        </motion.div>
      )}

      {/* ═══ Charts Row ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard gutter={[16, 16]} ghost wrap>
          {riskPieData.length > 0 && (
            <ProCard colSpan={8} title={<><FundOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />{t('dash.risk_dist')}</>}
              className="qs-card" headerBorderless>
              <Pie data={riskPieData} angleField="value" colorField="type" radius={0.85} innerRadius={0.6}
                color={({ type }) => RCQ[type] || '#6C5CE7'}
                label={{ type: 'inner', content: '{value}', style: { fontSize: 11, fill: '#fff' } }}
                legend={{ position: 'bottom', itemName: { style: { fill: labelColor, fontSize: 11 } } }}
                statistic={{
                  title: { content: t('dash.total'), style: { color: colors.textSecondary, fontSize: 11 } },
                  content: { content: `${result?.summary.total_findings||''}`, style: { color: colors.text, fontSize: 24, fontWeight: 800 } },
                }}
                height={260} theme={chartTheme}
              />
            </ProCard>
          )}
          {algBarData.length > 0 && (
            <ProCard colSpan={8} title={<><BugOutlined style={{ marginRight: 8, color: '#ff4757' }} />{t('dash.vuln_algo')}</>}
              className="qs-card" headerBorderless>
              <Column data={algBarData} xField="algo" yField="count" height={260}
                color={({ algo }) => { const fi = f.find(x => x.algorithm === algo); return RCQ[fi?.quantum_risk] || '#6C5CE7'; }}
                label={{ position: 'top', style: { fill: labelColor, fontSize: 10 } }}
                xAxis={{ label: { style: { fill: colors.textSecondary, fontSize: 9 }, autoRotate: true } }}
                yAxis={{ label: { style: { fill: colors.textDim, fontSize: 10 } }, grid: { line: { style: { stroke: gridColor } } } }}
                columnStyle={{ radius: [6,6,0,0] }} theme={chartTheme}
              />
            </ProCard>
          )}
          {radarData.length > 0 && (
            <ProCard colSpan={8} title={<><DashboardOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />{t('dash.quantum_readiness')}</>}
              className="qs-card" headerBorderless
              extra={<Space>
                <Button type="primary" size="small" onClick={() => onNavigate?.('migration')} icon={<ArrowRightOutlined />}
                  style={{ background: '#6C5CE7', border: 'none', fontSize: 11, borderRadius: 6 }}>{t('dash.migrate')}</Button>
                <Button size="small" onClick={() => onNavigate?.('compliance')} icon={<AuditOutlined />}
                  style={{ fontSize: 11, borderRadius: 6 }}>{t('dash.compliance')}</Button>
              </Space>}>
              <Radar data={radarData} xField="item" yField="score" height={260}
                meta={{ score: { min: 0, max: 100 } }}
                area={{ style: { fill: 'rgba(108,92,231,0.2)' } }}
                point={{ size: 3, style: { fill: '#6C5CE7', stroke: '#a29bfe', lineWidth: 1 } }}
                lineStyle={{ stroke: '#6C5CE7', lineWidth: 2 }}
                xAxis={{ label: { style: { fill: labelColor, fontSize: 10 } }, grid: { line: { style: { stroke: gridColor } } } }}
                yAxis={{ label: false, grid: { line: { style: { stroke: gridColor } } } }}
                theme={chartTheme}
              />
            </ProCard>
          )}
        </ProCard>
      </motion.div>

      {/* ═══ Risk Matrix + Business Impact + Timeline ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard gutter={[16, 16]} ghost wrap>
          {matrix && (
            <ProCard colSpan={8} title={<><FundOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />{t('dash.risk_matrix')}</>}
              className="qs-card" headerBorderless>
              <Row gutter={[10, 10]}>
                {[
                  { k: 'high_prob_high_impact', l: t('dash.high_prob_high'), c: '#ff4757' },
                  { k: 'high_prob_low_impact',  l: t('dash.high_prob_low'), c: '#ff6b35' },
                  { k: 'low_prob_high_impact',  l: t('dash.low_prob_high'), c: '#ffa502' },
                  { k: 'low_prob_low_impact',   l: t('dash.low_prob_low'), c: '#2ed573' },
                ].map(({ k, l, c }) => (
                  <Col span={12} key={k}>
                    <div className="risk-matrix-cell" style={{ background: `${c}08`, border: `1px solid ${c}30`, borderRadius: 10 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: c }}><CountUp end={matrix.counts[k]} duration={1} /></div>
                      <div style={{ fontSize: 10, color: `${c}cc`, marginTop: 2 }}>{l}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </ProCard>
          )}
          {bi && (
            <ProCard colSpan={matrix ? 8 : 12} title={<><ApiOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />{t('dash.business_impact')}</>}
              className="qs-card" headerBorderless>
              {Object.entries(bi).map(([key, cat]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 12 }}>{cat.label}</Text>
                    <Tag color={cat.level==='CRITICAL'?'red':cat.level==='HIGH'?'orange':'green'}
                      style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4 }}>{cat.normalized}%</Tag>
                  </div>
                  <Progress percent={cat.normalized} showInfo={false} size="small"
                    strokeColor={cat.level==='CRITICAL'?'#ff4757':cat.level==='HIGH'?'#ff6b35':'#2ed573'}
                    trailColor={trailColor} />
                </div>
              ))}
            </ProCard>
          )}
          <ProCard colSpan={result && matrix ? 8 : (result ? 12 : 24)}
            className="qs-card" headerBorderless
            title={<><ClockCircleOutlined style={{ marginRight: 8, color: '#6C5CE7' }} />{t('dash.threat_timeline')}</>}>
            {hndl && (
              <Row gutter={12} style={{ marginBottom: 16 }}>
                {[
                  { v: hndl.vulnerable_encryption_points, l: 'HNDL', c: hndl.risk_level==='CRITICAL'?'#ff4757':'#ffa502' },
                  { v: hndl.years_remaining, l: t('dash.hndl_years'), c: '#ffa502' },
                  { v: hndl.affected_algorithms?.length||0, l: t('dash.hndl_affected'), c: '#6C5CE7' },
                ].map((x,i) => (
                  <Col span={8} key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: x.c }}><CountUp end={x.v} duration={1} /></div>
                    <div style={{ fontSize: 10, color: colors.textSecondary }}>{x.l}</div>
                  </Col>
                ))}
              </Row>
            )}
            <Timeline items={[
              { color: 'green', children: <Text style={{ color: colors.text, fontSize: 12 }}>2024: NIST FIPS 203/204/205</Text> },
              { color: 'blue',  children: <Text style={{ color: colors.text, fontSize: 12 }}>2025: Chrome/Firefox ML-KEM</Text> },
              { color: 'orange',children: <Text style={{ color: colors.text, fontSize: 12 }}>2028: 1,000+ logical qubits</Text> },
              { color: 'red',   children: <Text style={{ color: '#ff7875', fontSize: 12 }}>2030: CRQC possible</Text> },
              { color: 'red',   children: <Text style={{ color: '#ff7875', fontSize: 12 }}>2031: NSA CNSA 2.0 deadline</Text> },
              { color: '#ff4757', children: <Text style={{ color: '#ff7875', fontSize: 12, fontWeight: 600 }}>2033: RSA-2048 breakable</Text> },
            ]} />
          </ProCard>
        </ProCard>
      </motion.div>

      {/* ═══ Language / Usage ═══ */}
      {result && (
        <motion.div variants={fadeUp}>
          <ProCard gutter={16} ghost>
            <ProCard colSpan={12} title={t('dash.lang_dist')} className="qs-card" headerBorderless>
              {Object.entries(result.summary.by_language||{}).sort((a,b)=>b[1]-a[1]).map(([lang,cnt]) => (
                <Tag key={lang} style={{ marginBottom: 6, fontSize: 12, borderRadius: 6 }} color="blue">{lang}: {cnt}</Tag>
              ))}
            </ProCard>
            <ProCard colSpan={12} title={t('dash.usage_type')} className="qs-card" headerBorderless>
              {Object.entries(result.summary.by_usage_type||{}).sort((a,b)=>b[1]-a[1]).map(([ut,cnt]) => (
                <Tag key={ut} style={{ marginBottom: 6, fontSize: 12, borderRadius: 6 }}>{ut}: {cnt}</Tag>
              ))}
            </ProCard>
          </ProCard>
        </motion.div>
      )}
    </motion.div>
  );
}
