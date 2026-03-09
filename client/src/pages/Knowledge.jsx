import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Typography, Tabs, Collapse, Timeline, Table, Space, Descriptions, Divider } from 'antd';
import {
  ExperimentOutlined, SafetyOutlined, WarningOutlined,
  ClockCircleOutlined, BookOutlined, LockOutlined,
  ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined,
  GlobalOutlined, ApiOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getAlgorithms, getTimeline, getVulnerabilities } from '../lib/api';

const { Title, Text, Paragraph } = Typography;
const RCQ = { CRITICAL: '#ff4757', HIGH: '#ff6b35', MEDIUM: '#ffa502', LOW: '#2ed573', SAFE: '#1e90ff' };

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } };

export default function Knowledge() {
  const [algorithms, setAlgorithms] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState({});
  const [activeTab, setActiveTab] = useState('pqc');

  useEffect(() => {
    getAlgorithms().then(setAlgorithms).catch(() => {});
    getTimeline().then(setTimeline).catch(() => {});
    getVulnerabilities().then(setVulnerabilities).catch(() => {});
  }, []);

  const typeColor = { milestone: 'blue', standard: 'green', prediction: 'orange', deadline: 'red' };
  const typeLabel = { milestone: '里程碑', standard: '标准', prediction: '预测', deadline: '截止日期' };

  const vulnColumns = [
    { title: '算法', dataIndex: 'algo', key: 'algo', width: 120, render: v => <Text strong style={{ color: '#ff7875' }}>{v}</Text> },
    { title: '风险', dataIndex: 'risk', key: 'risk', width: 90,
      sorter: (a, b) => { const o = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4 }; return o[a.risk] - o[b.risk]; },
      render: v => <Tag className={`tag-${(v||'').toLowerCase()}`} style={{ fontWeight: 600 }}>{v}</Tag> },
    { title: '类别', dataIndex: 'family', key: 'family', width: 100, render: v => <Tag style={{ borderRadius:4 }}>{v}</Tag> },
    { title: '量子威胁', dataIndex: 'quantum_threat', key: 'qt', ellipsis: true, render: v => <Text style={{ color:'#ccc', fontSize:12 }}>{v}</Text> },
    { title: '预计破解', dataIndex: 'time_to_break', key: 'ttb', width: 180, render: v => <Text style={{ color:'#ffa502', fontSize:12 }}>{v}</Text> },
    { title: '迁移目标', dataIndex: 'migration_target', key: 'mt', width: 160,
      render: v => v ? <Tag color="green" style={{ borderRadius:4 }}>{v}</Tag> : <Tag color="blue" style={{ borderRadius:4 }}>量子安全</Tag> },
    { title: 'NIST', dataIndex: 'nist_standard', key: 'nist', width: 100, render: v => <Tag color="blue" style={{ borderRadius:4 }}>{v}</Tag> },
    { title: '废弃年份', dataIndex: 'nist_deprecation_year', key: 'dep', width: 90,
      render: v => v ? <Tag color={v <= 2024 ? 'red' : v <= 2030 ? 'orange' : 'green'} style={{ borderRadius:4 }}>{v}</Tag> : '-' },
  ];

  const vulnData = Object.entries(vulnerabilities).map(([algo, v]) => ({ key: algo, algo, ...v }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Hero ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <ProCard className="hero-gradient" bodyStyle={{ position: 'relative', zIndex: 1 }}>
          <Row align="middle" gutter={24}>
            <Col flex="auto">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <BookOutlined style={{ fontSize: 26, color: '#6C5CE7' }} />
                <Title level={3} style={{ color: '#fff', margin: 0 }}>后量子密码学知识库</Title>
              </div>
              <Paragraph style={{ color: '#7a7a9e', margin: '8px 0 0', maxWidth: 680, fontSize: 13, lineHeight: 1.8 }}>
                NIST 后量子密码标准全面解析。涵盖 ML-KEM (FIPS 203)、ML-DSA (FIPS 204)、SLH-DSA (FIPS 205) 标准化算法，
                量子脆弱性知识库，以及量子计算发展时间线。
              </Paragraph>
            </Col>
            <Col>
              <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{ textAlign: 'center' }}>
                <LockOutlined style={{ fontSize: 52, color: '#6C5CE7', filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.4))' }} />
              </motion.div>
              <div style={{ color: '#4a4a6e', fontSize: 10, marginTop: 6, textAlign: 'center', letterSpacing: 0.5 }}>NIST FIPS 203/204/205</div>
            </Col>
          </Row>
        </ProCard>
      </motion.div>

      {/* ═══ Tabs ═══ */}
      <Tabs type="card" activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'pqc',
          label: <span><SafetyOutlined style={{ marginRight: 4 }} />PQC 标准算法</span>,
          children: (
            <AnimatePresence mode="wait">
              <motion.div key="pqc" variants={stagger} initial="hidden" animate="visible">
                <Row gutter={[16, 16]}>
                  {algorithms.map((algo) => (
                    <Col span={24} key={algo.id}>
                      <motion.div variants={fadeUp}>
                        <ProCard className="qs-card"
                          title={
                            <Space>
                              <ExperimentOutlined style={{ color: '#6C5CE7' }} />
                              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{algo.name}</Text>
                              <Tag color="blue" style={{ borderRadius: 4 }}>{algo.nist}</Tag>
                              <Tag color="green" style={{ borderRadius: 4 }}>{algo.status}</Tag>
                              <Tag style={{ borderRadius: 4 }}>{algo.category}</Tag>
                            </Space>
                          }>
                          <Paragraph style={{ color: '#bbb', marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>{algo.description}</Paragraph>
                          <Row gutter={16}>
                            <Col span={14}>
                              {algo.variants?.length > 0 && (
                                <Card size="small" title={<Text style={{ color: '#ddd', fontSize: 13 }}>参数变体</Text>}
                                  style={{ background: '#060614', border: '1px solid var(--qs-border)', marginBottom: 12, borderRadius: 10 }}>
                                  <Table dataSource={algo.variants.map((v, i) => ({ key: i, ...v }))} size="small" pagination={false}
                                    columns={[
                                      { title: '名称', dataIndex: 'name', render: v => <Text strong style={{ color: '#6C5CE7' }}>{v}</Text> },
                                      { title: '安全级别', dataIndex: 'level', render: v => <Tag color="blue" style={{ borderRadius:4 }}>{v}</Tag> },
                                      ...(algo.variants[0]?.pk ? [{ title: '公钥', dataIndex: 'pk' }] : []),
                                      ...(algo.variants[0]?.sk ? [{ title: '私钥', dataIndex: 'sk' }] : []),
                                      ...(algo.variants[0]?.sig ? [{ title: '签名', dataIndex: 'sig' }] : []),
                                      ...(algo.variants[0]?.ct ? [{ title: '密文', dataIndex: 'ct' }] : []),
                                      ...(algo.variants[0]?.ss ? [{ title: '共享密钥', dataIndex: 'ss' }] : []),
                                      ...(algo.variants[0]?.output ? [{ title: '输出', dataIndex: 'output' }] : []),
                                      ...(algo.variants[0]?.description ? [{ title: '描述', dataIndex: 'description' }] : []),
                                    ]} />
                                </Card>
                              )}
                              {algo.replaces && (
                                <div style={{ marginBottom: 12 }}>
                                  <Text style={{ color: '#7a7a9e', fontSize: 12 }}>替代算法: </Text>
                                  {algo.replaces.map((r, i) => <Tag key={i} color="red" style={{ marginBottom: 4, fontSize: 11, borderRadius:4 }}>{r}</Tag>)}
                                </div>
                              )}
                              {algo.libs && (
                                <Card size="small" title={<Text style={{ color: '#ddd', fontSize: 13 }}>各语言实现</Text>}
                                  style={{ background: '#060614', border: '1px solid var(--qs-border)', borderRadius: 10 }}>
                                  <Row gutter={[8, 6]}>
                                    {Object.entries(algo.libs).map(([lang, lib]) => (
                                      <Col span={8} key={lang}>
                                        <Text style={{ color: '#555577', fontSize: 12 }}>{lang}: </Text>
                                        <Tag color="blue" style={{ fontSize: 11, borderRadius:4 }}>{lib}</Tag>
                                      </Col>
                                    ))}
                                  </Row>
                                </Card>
                              )}
                            </Col>
                            <Col span={10}>
                              <Card size="small" style={{ background: '#060614', border: '1px solid var(--qs-border)', marginBottom: 12, borderRadius: 10 }}>
                                <div style={{ marginBottom: 12 }}>
                                  <Text style={{ color: '#2ed573', fontWeight: 600, fontSize: 13 }}><CheckCircleOutlined style={{ marginRight: 4 }} /> 优势</Text>
                                  <ul style={{ margin: '6px 0', paddingLeft: 20 }}>
                                    {algo.pros?.map((p, i) => <li key={i} style={{ color: '#bbb', fontSize: 12, marginBottom: 3 }}>{p}</li>)}
                                  </ul>
                                </div>
                                <Divider style={{ margin: '10px 0', borderColor: 'var(--qs-border)' }} />
                                <div>
                                  <Text style={{ color: '#ffa502', fontWeight: 600, fontSize: 13 }}><CloseCircleOutlined style={{ marginRight: 4 }} /> 局限</Text>
                                  <ul style={{ margin: '6px 0', paddingLeft: 20 }}>
                                    {algo.cons?.map((c, i) => <li key={i} style={{ color: '#999', fontSize: 12, marginBottom: 3 }}>{c}</li>)}
                                  </ul>
                                </div>
                              </Card>
                              <Descriptions size="small" column={1} bordered
                                labelStyle={{ color: '#7a7a9e', background: '#060614', fontSize: 12 }}
                                contentStyle={{ color: '#ddd', background: '#0a0a20', fontSize: 12 }}>
                                <Descriptions.Item label="困难问题">{algo.hardness}</Descriptions.Item>
                                <Descriptions.Item label="安全性">{algo.security}</Descriptions.Item>
                              </Descriptions>
                            </Col>
                          </Row>
                        </ProCard>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </motion.div>
            </AnimatePresence>
          ),
        },
        {
          key: 'vulns',
          label: <span><WarningOutlined style={{ marginRight: 4 }} />量子脆弱性</span>,
          children: (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <ProCard className="quantum-table qs-card">
                <Paragraph style={{ color: '#7a7a9e', marginBottom: 16, fontSize: 13 }}>
                  完整的量子脆弱算法知识库 — 覆盖 {vulnData.length} 种算法的量子威胁分析、预计破解时间线、NIST 迁移建议。
                  <br />
                  <Text style={{ color:'#555577', fontSize:12 }}>包含 Shor 算法 (公钥密码) 和 Grover 算法 (对称密码) 两大量子攻击向量。</Text>
                </Paragraph>
                <Table dataSource={vulnData} columns={vulnColumns} size="small" pagination={false}
                  expandable={{
                    expandedRowRender: r => (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Descriptions size="small" column={1} bordered
                            labelStyle={{ color: '#7a7a9e', background: '#060614', fontSize: 12, width: 120 }}
                            contentStyle={{ color: '#ddd', background: '#0a0a20', fontSize: 12 }}>
                            <Descriptions.Item label="中文描述">{r.description_zh}</Descriptions.Item>
                            <Descriptions.Item label="量子威胁">{r.quantum_threat}</Descriptions.Item>
                            <Descriptions.Item label="CWE">{r.cwe_id}</Descriptions.Item>
                          </Descriptions>
                        </Col>
                        <Col span={12}>
                          <div style={{ padding: 14, background: '#060614', borderRadius: 10, border:'1px solid var(--qs-border)' }}>
                            <Text style={{ color: '#7a7a9e', fontSize: 12 }}>威胁评估:</Text>
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Tag className={`tag-${(r.risk||'').toLowerCase()}`} style={{ fontSize: 14, padding: '4px 14px' }}>{r.risk}</Tag>
                              {r.migration_target && <span style={{ color: '#4a4a6e' }}>→</span>}
                              {r.migration_target && <Tag color="green" style={{ fontSize: 14, padding: '4px 14px', borderRadius:6 }}>{r.migration_target}</Tag>}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    ),
                  }} />
              </ProCard>
            </motion.div>
          ),
        },
        {
          key: 'timeline',
          label: <span><ClockCircleOutlined style={{ marginRight: 4 }} />量子时间线</span>,
          children: (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <ProCard className="qs-card">
                <Paragraph style={{ color: '#7a7a9e', marginBottom: 24, fontSize: 13 }}>
                  从量子优越性到密码学相关量子计算机 (CRQC) — 量子计算发展路线图与 PQC 迁移截止时间。
                </Paragraph>
                <Timeline mode="left"
                  items={timeline.map((t, idx) => ({
                    color: typeColor[t.type] || 'gray',
                    label: (
                      <div style={{ textAlign: 'right', paddingRight: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{t.year}</Text>
                        <br />
                        <Tag color={typeColor[t.type]} style={{ fontSize: 10, borderRadius:4 }}>{typeLabel[t.type] || t.type}</Tag>
                      </div>
                    ),
                    children: (
                      <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * idx }} viewport={{ once: true }}>
                        <Card size="small" style={{
                          background: t.type === 'deadline' ? 'rgba(255,71,87,0.06)' : '#060614',
                          border: `1px solid ${t.type === 'deadline' ? 'rgba(255,71,87,0.2)' : 'var(--qs-border)'}`,
                          maxWidth: 520, borderRadius: 10,
                        }}>
                          <Text style={{ color: t.type === 'deadline' ? '#ff7875' : '#ccc', fontSize: 13 }}>
                            {t.type === 'deadline' && <WarningOutlined style={{ marginRight: 6, color: '#ff4757' }} />}
                            {t.type === 'standard' && <SafetyOutlined style={{ marginRight: 6, color: '#2ed573' }} />}
                            {t.type === 'milestone' && <ThunderboltOutlined style={{ marginRight: 6, color: '#1e90ff' }} />}
                            {t.event}
                          </Text>
                        </Card>
                      </motion.div>
                    ),
                  }))} />
              </ProCard>
            </motion.div>
          ),
        },
      ]} />
    </div>
  );
}
