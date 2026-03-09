import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Upload, Input, Select, Table, Tag, Space, Typography, Collapse, Badge, message, Segmented, Progress, Steps, Spin } from 'antd';
import {
  UploadOutlined, CodeOutlined, ThunderboltOutlined, FileSearchOutlined,
  BugOutlined, WarningOutlined, ArrowRightOutlined,
  FolderOpenOutlined, FileOutlined, SecurityScanOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined,
  RocketOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { ProCard, StatisticCard, ProDescriptions } from '@ant-design/pro-components';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { scanCode, scanFiles, scanDemo, getDemoFiles, analyzeProtocols } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Divider } = StatisticCard;
const RCQ = { CRITICAL: '#ff4757', HIGH: '#ff6b35', MEDIUM: '#ffa502', LOW: '#2ed573', SAFE: '#1e90ff' };
const LANG_MAP = { python:'python', javascript:'javascript', java:'java', go:'go', c:'c', rust:'rust', csharp:'csharp', php:'php', config:'yaml', dependency:'text' };
const LANG_OPTS = [
  { value:'untitled.py', label:'Python' },{ value:'untitled.js', label:'JavaScript' },
  { value:'untitled.java', label:'Java' },{ value:'untitled.go', label:'Go' },
  { value:'untitled.c', label:'C/C++' },{ value:'untitled.rs', label:'Rust' },
  { value:'untitled.cs', label:'C#' },{ value:'untitled.php', label:'PHP' },
  { value:'untitled.rb', label:'Ruby' },{ value:'untitled.kt', label:'Kotlin' },
  { value:'untitled.swift', label:'Swift' },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };

export default function Scanner({ setScanResult, onNavigate }) {
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const [mode, setMode] = useState('demo');
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('untitled.py');
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [demoFiles, setDemoFiles] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(-1);
  const [protocolStacks, setProtocolStacks] = useState(null);

  useEffect(() => { getDemoFiles().then(setDemoFiles).catch(()=>{}); }, []);

  const PIPELINE_STEPS = [
    { title: t('scan.parse'), description: t('scan.parse_desc') },
    { title: t('scan.scan_step'), description: t('scan.scan_step_desc') },
    { title: t('scan.evaluate'), description: t('scan.evaluate_desc') },
    { title: t('scan.done'), description: t('scan.done_desc') },
  ];

  const handleScan = async () => {
    setLoading(true); setScanProgress(0); setPipelineStep(0);
    const iv = setInterval(() => {
      setScanProgress(p => {
        const next = p + Math.random() * 12;
        if (next >= 20 && pipelineStep < 1) setPipelineStep(1);
        if (next >= 50 && pipelineStep < 2) setPipelineStep(2);
        return Math.min(next, 92);
      });
    }, 250);

    try {
      let r;
      if (mode==='paste') {
        if (!code.trim()) { message.warning(t('scan.no_input_code')); setLoading(false); clearInterval(iv); return; }
        r = await scanCode(code, filename);
      } else if (mode==='upload') {
        if (!fileList.length) { message.warning(t('scan.no_input_file')); setLoading(false); clearInterval(iv); return; }
        r = await scanFiles(fileList.map(f => f.originFileObj||f));
      } else {
        r = await scanDemo();
      }
      clearInterval(iv);
      setScanProgress(100); setPipelineStep(3);
      setTimeout(() => { setResult(r); setScanResult?.(r); setLoading(false); }, 400);
      message.success(`${t('scan.complete')}：${r.summary.total_findings} findings · ${r.scan_duration_ms}ms`);
      if (r.id) analyzeProtocols(r.id).then(setProtocolStacks).catch(() => {});
    } catch (e) { clearInterval(iv); message.error('Scan failed'); setLoading(false); setPipelineStep(-1); }
  };

  const codeStyle = isDark ? vscDarkPlus : oneLight;

  const columns = [
    { title: t('scan.risk'), dataIndex:'quantum_risk', key:'qr', width:90,
      sorter:(a,b)=>{ const o={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3,SAFE:4}; return o[a.quantum_risk]-o[b.quantum_risk]; },
      render: v => <Tag className={`tag-${v.toLowerCase()}`} style={{ fontWeight:600, fontSize:11 }}>{v}</Tag> },
    { title: t('scan.algorithm'), dataIndex:'algorithm', key:'algo', width:130, render:v=><Text strong style={{ color:'#ff7875' }}>{v}</Text> },
    { title: t('scan.usage'), dataIndex:'usage_type', key:'ut', width:110, render:v=><Tag style={{ fontSize:11, borderRadius:4 }}>{v}</Tag> },
    { title: t('scan.file'), key:'file', width:220, ellipsis:true,
      render:(_,r)=><span><Text code style={{ fontSize:11 }}>{r.file_path}</Text><Text type="secondary" style={{ fontSize:11 }}> :L{r.line_number}</Text></span> },
    { title: t('scan.confidence'), dataIndex:'confidence', key:'conf', width:80,
      render:v=><Progress percent={Math.round(v*100)} size="small" strokeColor={v>0.8?'#2ed573':'#ffa502'} trailColor={isDark?'rgba(26,26,66,0.6)':'#f0f0f5'} /> },
    { title: t('scan.migration_target'), dataIndex:'migration_target', key:'mt', width:150,
      render:v=>v?<Tag color="green" style={{ fontSize:11 }}>{v}</Tag>:'-' },
    { title: t('scan.strategy'), dataIndex:'migration_strategy', key:'ms', width:90,
      render:v=><Tag color={v==='hybrid'?'blue':v==='pure_pqc'?'green':'orange'} style={{ fontSize:10, borderRadius:4 }}>{v}</Tag> },
  ];

  const trailColor = isDark ? 'rgba(26,26,66,0.6)' : '#f0f0f5';

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Scanner Input ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard className="qs-card"
          title={
            <Space>
              <SecurityScanOutlined style={{ color:'#6C5CE7', fontSize:18 }} />
              <span style={{ fontWeight:700, fontSize:15 }}>{t('scan.title')}</span>
              <Tag style={{ background:'rgba(108,92,231,0.12)', border:'1px solid rgba(108,92,231,0.3)', color:'#a29bfe', fontSize:10, fontWeight:600 }}>{t('scan.rules_tag')}</Tag>
            </Space>
          }
          extra={
            <Segmented value={mode} onChange={setMode} options={[
              { value:'demo', label:<span><ThunderboltOutlined /> {t('scan.demo')}</span> },
              { value:'paste', label:<span><CodeOutlined /> {t('scan.paste')}</span> },
              { value:'upload', label:<span><UploadOutlined /> {t('scan.upload')}</span> },
            ]} />
          }
          headerBorderless>

          {mode==='paste' && (
            <div>
              <Select value={filename} onChange={setFilename} options={LANG_OPTS}
                style={{ width:200, marginBottom:12 }} />
              <TextArea value={code} onChange={e=>setCode(e.target.value)}
                placeholder={t('scan.paste_placeholder')}
                autoSize={{ minRows:10, maxRows:25 }}
                style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:13, background:colors.bgCode, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:10 }} />
            </div>
          )}
          {mode==='upload' && (
            <Upload.Dragger multiple fileList={fileList} onChange={({fileList:fl})=>setFileList(fl)} beforeUpload={()=>false}
              accept=".py,.js,.ts,.java,.go,.c,.cpp,.h,.rs,.cs,.php,.conf,.yaml,.yml,.toml,.json,.pem,.crt,.key,.txt,.xml,.mod,.lock,.gradle">
              <p className="ant-upload-drag-icon"><UploadOutlined style={{ color:'#6C5CE7', fontSize:48 }} /></p>
              <p style={{ color:colors.text, fontSize:14, fontWeight:500 }}>{t('scan.upload_hint')}</p>
              <p style={{ color:colors.textSecondary, fontSize:12 }}>{t('scan.upload_desc')}</p>
            </Upload.Dragger>
          )}
          {mode==='demo' && (
            <div>
              <Paragraph style={{ color:colors.textSecondary, marginBottom:12, fontSize:13 }}>{t('scan.demo_desc')}</Paragraph>
              <Collapse
                style={{ background:colors.bgCode, border:`1px solid ${colors.border}`, borderRadius:10 }}
                items={demoFiles.map((f,i)=>({
                  key:i,
                  label:<span style={{ color:colors.text }}>
                    <FileOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{f.name}
                    <Tag style={{ marginLeft:8, fontSize:10 }} color="blue">{f.language}</Tag>
                  </span>,
                  children:<SyntaxHighlighter language={LANG_MAP[f.language]||'text'} style={codeStyle} showLineNumbers wrapLongLines
                    customStyle={{ maxHeight:350, fontSize:12, margin:0, borderRadius:8, background:colors.bgCode }}>{f.content}</SyntaxHighlighter>,
                }))} />
            </div>
          )}

          {loading && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
              style={{ margin:'16px 0 8px', padding:'16px 20px', background:isDark?'rgba(108,92,231,0.04)':'rgba(108,92,231,0.03)', borderRadius:12, border:`1px solid ${isDark?'rgba(108,92,231,0.1)':'rgba(108,92,231,0.08)'}` }}>
              <Steps size="small" current={pipelineStep}
                items={PIPELINE_STEPS.map((s,i) => ({
                  ...s,
                  icon: pipelineStep === i ? <LoadingOutlined spin style={{ color:'#6C5CE7' }} /> :
                    pipelineStep > i ? <CheckCircleOutlined style={{ color:'#2ed573' }} /> : undefined,
                }))} />
              <Progress percent={scanProgress} showInfo={false}
                strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
                trailColor={trailColor} strokeWidth={4} style={{ marginTop: 12 }} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <Text style={{ color:'#6C5CE7', fontSize:12 }}>{PIPELINE_STEPS[Math.min(pipelineStep, 3)]?.title}...</Text>
                <Text style={{ color:colors.textDim, fontSize:12 }}>{Math.round(scanProgress)}%</Text>
              </div>
            </motion.div>
          )}

          <div style={{ marginTop: loading ? 8 : 16 }}>
            <Button type="primary" size="large" icon={<ThunderboltOutlined />} loading={loading} onClick={handleScan} block
              className="qs-btn-gradient" style={{ height:50, fontSize:15 }}>
              {loading ? `${t('scan.scanning')} ${Math.round(scanProgress)}%` : t('scan.start')}
            </Button>
          </div>
        </ProCard>
      </motion.div>

      {/* ═══ Results ═══ */}
      {result && (
        <>
          <motion.div variants={fadeUp}>
            <StatisticCard.Group direction="row" style={{ borderRadius:12, overflow:'hidden' }}>
              <StatisticCard statistic={{ title:t('scan.file'), value:result.total_files, valueStyle:{color:'#6C5CE7'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:t('dash.total_findings'), value:result.summary.total_findings, valueStyle:{color:'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'CRITICAL', value:result.summary.by_risk?.CRITICAL||0, valueStyle:{color:'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'HIGH', value:result.summary.by_risk?.HIGH||0, valueStyle:{color:'#ff6b35'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'Readiness', value:result.quantum_readiness_score,
                valueStyle:{color: result.quantum_readiness_score>60?'#2ed573':'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:t('dash.scan_duration'), value:result.scan_duration_ms, suffix:'ms', valueStyle:{color:'#2ed573'} }} />
            </StatisticCard.Group>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProCard className="quantum-table qs-card"
              title={<span><BugOutlined style={{ marginRight:8, color:'#ff4757' }} />{t('scan.findings')} <Badge count={result.summary.total_findings} style={{ marginLeft:8, backgroundColor:'#ff4757' }} /></span>}
              extra={<Space>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={()=>onNavigate?.('migration')}
                  style={{ background:'#6C5CE7', border:'none', borderRadius:8 }}>{t('scan.migration_plan')}</Button>
                <Button icon={<SafetyOutlined />} onClick={()=>onNavigate?.('compliance')}
                  style={{ borderRadius:8 }}>{t('scan.compliance_report')}</Button>
              </Space>}
              headerBorderless>
              <Table dataSource={result.findings.map((f,i)=>({...f,key:i}))}
                columns={columns} size="small" pagination={{ pageSize:15, showSizeChanger:true, showTotal:total => t('scan.total_items', total) }}
                expandable={{
                  expandedRowRender: r => (
                    <ProCard gutter={16} ghost>
                      <ProCard colSpan={12}>
                        <Text strong style={{ color:colors.textSecondary, fontSize:12 }}>{t('scan.code_context')}:</Text>
                        <SyntaxHighlighter language={LANG_MAP[r.tags?.[0]]||'text'} style={codeStyle}
                          customStyle={{ margin:'8px 0', padding:12, fontSize:12, borderRadius:10, border:`1px solid ${colors.border}`, background:colors.bgCode }}>
                          {[r.context_before, `>>> ${r.code_snippet}  // ← Line ${r.line_number}`, r.context_after].filter(Boolean).join('\n')}
                        </SyntaxHighlighter>
                      </ProCard>
                      <ProCard colSpan={12}>
                        <ProDescriptions column={1} size="small"
                          labelStyle={{ color:colors.textSecondary, fontSize:11, width:80 }}
                          contentStyle={{ color:colors.text, fontSize:12 }}>
                          <ProDescriptions.Item label={t('scan.quantum_threat')}><Text style={{ color:'#ffa502' }}>{r.description}</Text></ProDescriptions.Item>
                          <ProDescriptions.Item label={t('scan.zh_desc')}>{r.description_zh}</ProDescriptions.Item>
                          <ProDescriptions.Item label="CWE"><Tag style={{ borderRadius:4 }}>{r.cwe_id}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label="NIST"><Tag color="blue" style={{ borderRadius:4 }}>{r.nist_standard}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label={t('scan.deprecation_year')}><Tag color={r.nist_deprecation_year<=2024?'red':'orange'} style={{ borderRadius:4 }}>{r.nist_deprecation_year}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label={t('scan.migration_path')}>
                            <Tag color="red" style={{ borderRadius:4 }}>{r.algorithm}</Tag>
                            <ArrowRightOutlined style={{ margin:'0 6px', color:colors.textDim, fontSize:10 }} />
                            <Tag color="green" style={{ borderRadius:4 }}>{r.migration_target}</Tag>
                          </ProDescriptions.Item>
                          <ProDescriptions.Item label={t('scan.external_facing')}>
                            {r.is_external_facing ? <Tag color="red">{t('scan.yes')}</Tag> : <Tag color="green">{t('scan.no')}</Tag>}
                          </ProDescriptions.Item>
                        </ProDescriptions>
                      </ProCard>
                    </ProCard>
                  ),
                }} />
            </ProCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProCard title={<span><FolderOpenOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{t('scan.file_dist')}</span>}
              className="qs-card" headerBorderless>
              <Collapse
                style={{ background:colors.bgCode, border:'none', borderRadius:10 }}
                items={Object.entries(result.fileResults||{}).map(([fn,fr],i)=>({
                  key:i,
                  label:<span style={{ color:colors.text }}>
                    <FileOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{fn}
                    <Badge count={fr.total} style={{ marginLeft:12, backgroundColor: fr.risk_counts?.CRITICAL>0?'#ff4757':'#ff6b35' }} />
                    <Tag style={{ marginLeft:8, fontSize:10, borderRadius:4 }}>{fr.language}</Tag>
                  </span>,
                  children: fr.findings.map((f,j) => (
                    <div key={j} style={{ padding:'8px 14px', marginBottom:3, background:isDark?'#0a0a20':'#f8f8fc', borderRadius:8, borderLeft:`3px solid ${RCQ[f.quantum_risk]}`, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <Tag className={`tag-${f.quantum_risk.toLowerCase()}`} style={{ fontSize:10 }}>{f.quantum_risk}</Tag>
                      <Text strong style={{ color:'#ff7875', fontSize:12 }}>{f.algorithm}</Text>
                      <Text style={{ color:colors.textDim, fontSize:11 }}>L{f.line_number}</Text>
                      <ArrowRightOutlined style={{ color:colors.textDim, fontSize:10 }} />
                      <Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{f.migration_target}</Tag>
                    </div>
                  )),
                }))} />
            </ProCard>
          </motion.div>

          {/* ═══ Protocol Stack Detection ═══ */}
          {protocolStacks && protocolStacks.total_stacks > 0 && (
            <motion.div variants={fadeUp}>
              <ProCard title={
                <span>
                  <SafetyOutlined style={{ marginRight:8, color:'#ffa502' }} />
                  {t('scan.protocol_stack')}
                  <Badge count={protocolStacks.total_stacks} style={{ marginLeft:12, backgroundColor:'#ffa502' }} />
                </span>
              } className="qs-card" headerBorderless>
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  <Tag color="blue">{t('scan.tls_stacks')}: {protocolStacks.tls_stacks}</Tag>
                  <Tag color="purple">{t('scan.custom_stacks')}: {protocolStacks.custom_stacks}</Tag>
                </div>
                {protocolStacks.protocol_stacks.map((stack, i) => (
                  <div key={i} style={{ padding:16, marginBottom:12, background:isDark?'#0a0a20':'#f8f8fc', borderRadius:10, border:`1px solid ${stack.risk === 'CRITICAL' ? 'rgba(255,71,87,0.3)' : 'rgba(255,165,2,0.3)'}`, borderLeft:`4px solid ${stack.risk === 'CRITICAL' ? '#ff4757' : '#ffa502'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                      <Space>
                        <Tag color={stack.type === 'TLS' ? 'blue' : 'purple'}>{stack.type}</Tag>
                        <Text code style={{ fontSize:11 }}>{stack.file}</Text>
                        <Tag color={stack.risk === 'CRITICAL' ? 'red' : 'orange'}>{stack.risk}</Tag>
                      </Space>
                      <Text style={{ color:colors.textDim, fontSize:11 }}>{stack.finding_count} findings</Text>
                    </div>
                    <Row gutter={12}>
                      {[
                        { key: 'kem', label: t('scan.kem'), comp: stack.components.kem, target: stack.migration_target.kem },
                        { key: 'sig', label: t('scan.signature'), comp: stack.components.signature, target: stack.migration_target.signature },
                        { key: 'aead', label: t('scan.aead'), comp: stack.components.aead, target: stack.migration_target.aead },
                      ].map(({ key, label, comp, target }) => (
                        <Col span={8} key={key}>
                          <div style={{ padding:8, background:isDark?'rgba(108,92,231,0.06)':'rgba(108,92,231,0.03)', borderRadius:6 }}>
                            <Text style={{ color:colors.textSecondary, fontSize:10, display:'block' }}>{label}</Text>
                            {comp.length > 0
                              ? comp.map((a,j) => <Tag key={j} color="red" style={{ fontSize:10, margin:'2px 2px 0 0' }}>{a}</Tag>)
                              : <Text style={{ color:colors.textDim, fontSize:11 }}>{t('scan.not_detected')}</Text>}
                            <div style={{ marginTop:4 }}>
                              <ArrowRightOutlined style={{ color:'#2ed573', fontSize:9, marginRight:4 }} />
                              <Text style={{ color:'#2ed573', fontSize:10 }}>{target}</Text>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </ProCard>
            </motion.div>
          )}

          {/* ═══ Correlation Analysis — IMPROVED LAYOUT ═══ */}
          <motion.div variants={fadeUp}>
            <ProCard title={
              <span>
                <ExclamationCircleOutlined style={{ marginRight:8, color:'#a29bfe' }} />
                {t('scan.correlation')}
              </span>
            } className="qs-card" headerBorderless>
              <Row gutter={[16, 16]}>
                {/* Algorithm aggregation — full width on top */}
                <Col xs={24} lg={12}>
                  <div style={{ padding: 16, background: isDark ? '#0a0a20' : '#f8f8fc', borderRadius: 10, border: `1px solid ${colors.border}`, height: '100%' }}>
                    <Text strong style={{ color: colors.text, fontSize: 14, display: 'block', marginBottom: 12 }}>{t('scan.by_algorithm')}</Text>
                    {Object.entries(result.summary.by_algorithm || {}).sort((a,b) => b[1] - a[1]).map(([algo, count], i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${isDark?'rgba(26,26,66,0.3)':colors.border}` }}>
                        <Tag color="red" style={{ fontSize:10, minWidth:90, textAlign:'center' }}>{algo}</Tag>
                        <Progress percent={Math.round((count / result.summary.total_findings) * 100)} size="small" strokeColor="#6C5CE7" trailColor={trailColor} style={{ flex:1 }} />
                        <Text style={{ color:colors.textSecondary, fontSize:11, minWidth:30, textAlign:'right' }}>{count}</Text>
                      </div>
                    ))}
                  </div>
                </Col>
                {/* Usage type + Library deps in second column */}
                <Col xs={24} lg={12}>
                  <div style={{ padding: 16, background: isDark ? '#0a0a20' : '#f8f8fc', borderRadius: 10, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
                    <Text strong style={{ color: colors.text, fontSize: 14, display: 'block', marginBottom: 12 }}>{t('scan.by_usage')}</Text>
                    {Object.entries(result.summary.by_usage_type || {}).sort((a,b) => b[1] - a[1]).map(([usage, count], i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${isDark?'rgba(26,26,66,0.3)':colors.border}` }}>
                        <Tag style={{ fontSize:10, minWidth:90, textAlign:'center' }}>{usage}</Tag>
                        <Progress percent={Math.round((count / result.summary.total_findings) * 100)} size="small" strokeColor="#ffa502" trailColor={trailColor} style={{ flex:1 }} />
                        <Text style={{ color:colors.textSecondary, fontSize:11, minWidth:30, textAlign:'right' }}>{count}</Text>
                      </div>
                    ))}
                  </div>
                  {result.summary.by_library && Object.keys(result.summary.by_library).length > 0 && (
                    <div style={{ padding: 16, background: isDark ? '#0a0a20' : '#f8f8fc', borderRadius: 10, border: `1px solid ${colors.border}` }}>
                      <Text strong style={{ color: colors.text, fontSize: 14, display: 'block', marginBottom: 12 }}>{t('scan.by_library')}</Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(result.summary.by_library).sort((a,b) => b[1] - a[1]).map(([lib, count], i) => (
                          <Tag key={i} color="purple" style={{ fontSize: 11, borderRadius: 6, padding: '4px 10px' }}>
                            {lib} <span style={{ opacity: 0.7 }}>×{count}</span>
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Col>
              </Row>
            </ProCard>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
