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
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { scanCode, scanFiles, scanDemo, getDemoFiles } from '../lib/api';

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

/* ─── Scan pipeline steps ─── */
const PIPELINE_STEPS = [
  { title: '解析', description: '代码结构分析' },
  { title: '扫描', description: '150+ 规则匹配' },
  { title: '评估', description: '量子风险评分' },
  { title: '完成', description: '生成报告' },
];

export default function Scanner({ setScanResult, onNavigate }) {
  const [mode, setMode] = useState('demo');
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('untitled.py');
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [demoFiles, setDemoFiles] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(-1);

  useEffect(() => { getDemoFiles().then(setDemoFiles).catch(()=>{}); }, []);

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
        if (!code.trim()) { message.warning('请输入代码'); setLoading(false); clearInterval(iv); return; }
        r = await scanCode(code, filename);
      } else if (mode==='upload') {
        if (!fileList.length) { message.warning('请上传文件'); setLoading(false); clearInterval(iv); return; }
        r = await scanFiles(fileList.map(f => f.originFileObj||f));
      } else {
        r = await scanDemo();
      }
      clearInterval(iv);
      setScanProgress(100); setPipelineStep(3);
      setTimeout(() => { setResult(r); setScanResult?.(r); setLoading(false); }, 400);
      message.success(`扫描完成：${r.summary.total_findings} 个发现 · ${r.scan_duration_ms}ms`);
    } catch (e) { clearInterval(iv); message.error('扫描失败'); setLoading(false); setPipelineStep(-1); }
  };

  const columns = [
    { title:'风险', dataIndex:'quantum_risk', key:'qr', width:90,
      sorter:(a,b)=>{ const o={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3,SAFE:4}; return o[a.quantum_risk]-o[b.quantum_risk]; },
      render: v => <Tag className={`tag-${v.toLowerCase()}`} style={{ fontWeight:600, fontSize:11 }}>{v}</Tag> },
    { title:'算法', dataIndex:'algorithm', key:'algo', width:130, render:v=><Text strong style={{ color:'#ff7875' }}>{v}</Text> },
    { title:'用途', dataIndex:'usage_type', key:'ut', width:110, render:v=><Tag style={{ fontSize:11, borderRadius:4 }}>{v}</Tag> },
    { title:'文件', key:'file', width:220, ellipsis:true,
      render:(_,r)=><span><Text code style={{ fontSize:11 }}>{r.file_path}</Text><Text type="secondary" style={{ fontSize:11 }}> :L{r.line_number}</Text></span> },
    { title:'置信度', dataIndex:'confidence', key:'conf', width:80,
      render:v=><Progress percent={Math.round(v*100)} size="small" strokeColor={v>0.8?'#2ed573':'#ffa502'} trailColor="rgba(26,26,66,0.6)" /> },
    { title:'迁移目标', dataIndex:'migration_target', key:'mt', width:150,
      render:v=>v?<Tag color="green" style={{ fontSize:11 }}>{v}</Tag>:'-' },
    { title:'策略', dataIndex:'migration_strategy', key:'ms', width:90,
      render:v=><Tag color={v==='hybrid'?'blue':v==='pure_pqc'?'green':'orange'} style={{ fontSize:10, borderRadius:4 }}>{v}</Tag> },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Scanner Input ═══ */}
      <motion.div variants={fadeUp}>
        <ProCard className="qs-card"
          title={
            <Space>
              <SecurityScanOutlined style={{ color:'#6C5CE7', fontSize:18 }} />
              <span style={{ fontWeight:700, fontSize:15 }}>QuantumShield Scanner</span>
              <Tag style={{ background:'rgba(108,92,231,0.12)', border:'1px solid rgba(108,92,231,0.3)', color:'#a29bfe', fontSize:10, fontWeight:600 }}>11 种语言 · 200+ 规则</Tag>
            </Space>
          }
          extra={
            <Segmented value={mode} onChange={setMode} options={[
              { value:'demo', label:<span><ThunderboltOutlined /> 演示</span> },
              { value:'paste', label:<span><CodeOutlined /> 粘贴代码</span> },
              { value:'upload', label:<span><UploadOutlined /> 上传文件</span> },
            ]} />
          }
          headerBorderless>

          {mode==='paste' && (
            <div>
              <Select value={filename} onChange={setFilename} options={LANG_OPTS}
                style={{ width:200, marginBottom:12 }} />
              <TextArea value={code} onChange={e=>setCode(e.target.value)}
                placeholder="粘贴代码到此处，支持 Python / JavaScript / Java / Go / C/C++ / Rust / C# / PHP..."
                autoSize={{ minRows:10, maxRows:25 }}
                style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:13, background:'#060614', color:'#ddd', border:'1px solid var(--qs-border)', borderRadius:10 }} />
            </div>
          )}
          {mode==='upload' && (
            <Upload.Dragger multiple fileList={fileList} onChange={({fileList:fl})=>setFileList(fl)} beforeUpload={()=>false}
              accept=".py,.js,.ts,.java,.go,.c,.cpp,.h,.rs,.cs,.php,.conf,.yaml,.yml,.toml,.json,.pem,.crt,.key,.txt,.xml,.mod,.lock,.gradle">
              <p className="ant-upload-drag-icon"><UploadOutlined style={{ color:'#6C5CE7', fontSize:48 }} /></p>
              <p style={{ color:'#ccc', fontSize:14, fontWeight:500 }}>拖拽文件到此区域，或点击选择</p>
              <p style={{ color:'#7a7a9e', fontSize:12 }}>支持 Python, JavaScript, Java, Go, C/C++, Rust, C#, PHP + 配置/依赖文件</p>
            </Upload.Dragger>
          )}
          {mode==='demo' && (
            <div>
              <Paragraph style={{ color:'#7a7a9e', marginBottom:12, fontSize:13 }}>
                演示项目包含 5 个多语言文件 (Python, JavaScript, Java, Go, C) + 依赖文件，覆盖 18 种量子脆弱算法。
              </Paragraph>
              <Collapse
                style={{ background:'#060614', border:'1px solid var(--qs-border)', borderRadius:10 }}
                items={demoFiles.map((f,i)=>({
                  key:i,
                  label:<span style={{ color:'#ddd' }}>
                    <FileOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{f.name}
                    <Tag style={{ marginLeft:8, fontSize:10 }} color="blue">{f.language}</Tag>
                  </span>,
                  children:<SyntaxHighlighter language={LANG_MAP[f.language]||'text'} style={vscDarkPlus} showLineNumbers wrapLongLines
                    customStyle={{ maxHeight:350, fontSize:12, margin:0, borderRadius:8, background:'#060614' }}>{f.content}</SyntaxHighlighter>,
                }))} />
            </div>
          )}

          {/* ─── Scan Pipeline Progress ─── */}
          {loading && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
              style={{ margin:'16px 0 8px', padding:'16px 20px', background:'rgba(108,92,231,0.04)', borderRadius:12, border:'1px solid rgba(108,92,231,0.1)' }}>
              <Steps size="small" current={pipelineStep}
                items={PIPELINE_STEPS.map((s,i) => ({
                  ...s,
                  icon: pipelineStep === i ? <LoadingOutlined spin style={{ color:'#6C5CE7' }} /> :
                    pipelineStep > i ? <CheckCircleOutlined style={{ color:'#2ed573' }} /> : undefined,
                }))} />
              <Progress
                percent={scanProgress}
                showInfo={false}
                strokeColor={{ '0%': '#6C5CE7', '100%': '#2ed573' }}
                trailColor="rgba(26,26,66,0.6)"
                strokeWidth={4}
                style={{ marginTop: 12 }}
              />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <Text style={{ color:'#6C5CE7', fontSize:12 }}>{PIPELINE_STEPS[Math.min(pipelineStep, 3)]?.title}...</Text>
                <Text style={{ color:'#555577', fontSize:12 }}>{Math.round(scanProgress)}%</Text>
              </div>
            </motion.div>
          )}

          {/* Scan Button */}
          <div style={{ marginTop: loading ? 8 : 16 }}>
            <Button type="primary" size="large" icon={<ThunderboltOutlined />} loading={loading} onClick={handleScan} block
              className="qs-btn-gradient" style={{ height:50, fontSize:15 }}>
              {loading ? `扫描中... ${Math.round(scanProgress)}%` : '开始 QuantumShield 扫描'}
            </Button>
          </div>
        </ProCard>
      </motion.div>

      {/* ═══ Results ═══ */}
      {result && (
        <>
          <motion.div variants={fadeUp}>
            <StatisticCard.Group direction="row" style={{ borderRadius:12, overflow:'hidden' }}>
              <StatisticCard statistic={{ title:'文件', value:result.total_files, valueStyle:{color:'#6C5CE7'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'总发现', value:result.summary.total_findings, valueStyle:{color:'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'CRITICAL', value:result.summary.by_risk?.CRITICAL||0, valueStyle:{color:'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'HIGH', value:result.summary.by_risk?.HIGH||0, valueStyle:{color:'#ff6b35'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'Readiness', value:result.quantum_readiness_score,
                valueStyle:{color: result.quantum_readiness_score>60?'#2ed573':'#ff4757'} }} />
              <Divider type="vertical" />
              <StatisticCard statistic={{ title:'耗时', value:result.scan_duration_ms, suffix:'ms', valueStyle:{color:'#2ed573'} }} />
            </StatisticCard.Group>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProCard className="quantum-table qs-card"
              title={<span><BugOutlined style={{ marginRight:8, color:'#ff4757' }} />扫描发现 <Badge count={result.summary.total_findings} style={{ marginLeft:8, backgroundColor:'#ff4757' }} /></span>}
              extra={<Space>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={()=>onNavigate?.('migration')}
                  style={{ background:'#6C5CE7', border:'none', borderRadius:8 }}>迁移方案</Button>
                <Button icon={<SafetyOutlined />} onClick={()=>onNavigate?.('compliance')}
                  style={{ borderRadius:8 }}>合规报告</Button>
              </Space>}
              headerBorderless>
              <Table dataSource={result.findings.map((f,i)=>({...f,key:i}))}
                columns={columns} size="small" pagination={{ pageSize:15, showSizeChanger:true, showTotal:t=>`共 ${t} 项` }}
                expandable={{
                  expandedRowRender: r => (
                    <ProCard gutter={16} ghost>
                      <ProCard colSpan={12}>
                        <Text strong style={{ color:'#8888aa', fontSize:12 }}>代码上下文:</Text>
                        <SyntaxHighlighter language={LANG_MAP[r.tags?.[0]]||'text'} style={vscDarkPlus}
                          customStyle={{ margin:'8px 0', padding:12, fontSize:12, borderRadius:10, border:'1px solid var(--qs-border)', background:'#060614' }}>
                          {[r.context_before, `>>> ${r.code_snippet}  // ← Line ${r.line_number}`, r.context_after].filter(Boolean).join('\n')}
                        </SyntaxHighlighter>
                      </ProCard>
                      <ProCard colSpan={12}>
                        <ProDescriptions column={1} size="small"
                          labelStyle={{ color:'#7a7a9e', fontSize:11, width:80 }}
                          contentStyle={{ color:'#ddd', fontSize:12 }}>
                          <ProDescriptions.Item label="量子威胁"><Text style={{ color:'#ffa502' }}>{r.description}</Text></ProDescriptions.Item>
                          <ProDescriptions.Item label="中文描述">{r.description_zh}</ProDescriptions.Item>
                          <ProDescriptions.Item label="CWE"><Tag style={{ borderRadius:4 }}>{r.cwe_id}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label="NIST"><Tag color="blue" style={{ borderRadius:4 }}>{r.nist_standard}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label="废弃年份"><Tag color={r.nist_deprecation_year<=2024?'red':'orange'} style={{ borderRadius:4 }}>{r.nist_deprecation_year}</Tag></ProDescriptions.Item>
                          <ProDescriptions.Item label="迁移路径">
                            <Tag color="red" style={{ borderRadius:4 }}>{r.algorithm}</Tag>
                            <ArrowRightOutlined style={{ margin:'0 6px', color:'#555', fontSize:10 }} />
                            <Tag color="green" style={{ borderRadius:4 }}>{r.migration_target}</Tag>
                          </ProDescriptions.Item>
                          <ProDescriptions.Item label="外部暴露">
                            {r.is_external_facing ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>}
                          </ProDescriptions.Item>
                        </ProDescriptions>
                      </ProCard>
                    </ProCard>
                  ),
                }} />
            </ProCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProCard title={<span><FolderOpenOutlined style={{ marginRight:8, color:'#6C5CE7' }} />按文件分布</span>}
              className="qs-card" headerBorderless>
              <Collapse
                style={{ background:'#060614', border:'none', borderRadius:10 }}
                items={Object.entries(result.fileResults||{}).map(([fn,fr],i)=>({
                  key:i,
                  label:<span style={{ color:'#ddd' }}>
                    <FileOutlined style={{ marginRight:8, color:'#6C5CE7' }} />{fn}
                    <Badge count={fr.total} style={{ marginLeft:12, backgroundColor: fr.risk_counts?.CRITICAL>0?'#ff4757':'#ff6b35' }} />
                    <Tag style={{ marginLeft:8, fontSize:10, borderRadius:4 }}>{fr.language}</Tag>
                  </span>,
                  children: fr.findings.map((f,j) => (
                    <div key={j} style={{ padding:'8px 14px', marginBottom:3, background:'#0a0a20', borderRadius:8, borderLeft:`3px solid ${RCQ[f.quantum_risk]}`, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <Tag className={`tag-${f.quantum_risk.toLowerCase()}`} style={{ fontSize:10 }}>{f.quantum_risk}</Tag>
                      <Text strong style={{ color:'#ff7875', fontSize:12 }}>{f.algorithm}</Text>
                      <Text style={{ color:'#555577', fontSize:11 }}>L{f.line_number}</Text>
                      <ArrowRightOutlined style={{ color:'#4a4a6e', fontSize:10 }} />
                      <Tag color="green" style={{ fontSize:10, borderRadius:4 }}>{f.migration_target}</Tag>
                    </div>
                  )),
                }))} />
            </ProCard>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
