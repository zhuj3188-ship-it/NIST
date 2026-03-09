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
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Title, Text, Paragraph } = Typography;
const RCQ = { CRITICAL: '#ff4757', HIGH: '#ff6b35', MEDIUM: '#ffa502', LOW: '#2ed573', SAFE: '#1e90ff' };

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } };

export default function Knowledge() {
  const { isDark, colors } = useTheme();
  const { t, lang } = useI18n();
  const [algorithms, setAlgorithms] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState({});
  const [activeTab, setActiveTab] = useState('pqc');
  const isZh = lang === 'zh';

  useEffect(() => {
    getAlgorithms().then(setAlgorithms).catch(() => {});
    getTimeline().then(setTimeline).catch(() => {});
    getVulnerabilities().then(setVulnerabilities).catch(() => {});
  }, []);

  const typeColor = { milestone: 'blue', standard: 'green', prediction: 'orange', deadline: 'red' };
  const typeLabel = isZh
    ? { milestone: '里程碑', standard: '标准', prediction: '预测', deadline: '截止日期' }
    : { milestone: 'Milestone', standard: 'Standard', prediction: 'Prediction', deadline: 'Deadline' };

  const vulnColumns = [
    { title: t('know.algo'), dataIndex: 'algo', key: 'algo', width: 120, render: v => <Text strong style={{ color: '#ff7875' }}>{v}</Text> },
    { title: t('know.risk'), dataIndex: 'risk', key: 'risk', width: 90,
      sorter: (a, b) => { const o = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4 }; return o[a.risk] - o[b.risk]; },
      render: v => <Tag className={`tag-${(v||'').toLowerCase()}`} style={{ fontWeight: 600 }}>{v}</Tag> },
    { title: t('know.family'), dataIndex: 'family', key: 'family', width: 100, render: v => <Tag style={{ borderRadius:4 }}>{v}</Tag> },
    { title: t('know.quantum_threat'), dataIndex: 'quantum_threat', key: 'qt', ellipsis: true, render: v => <Text style={{ color: colors.text, fontSize:12 }}>{v}</Text> },
    { title: t('know.time_to_break'), dataIndex: 'time_to_break', key: 'ttb', width: 180, render: v => <Text style={{ color:'#ffa502', fontSize:12 }}>{v}</Text> },
    { title: t('know.migration_target'), dataIndex: 'migration_target', key: 'mt', width: 160,
      render: v => v ? <Tag color="green" style={{ borderRadius:4 }}>{v}</Tag> : <Tag color="blue" style={{ borderRadius:4 }}>{t('know.quantum_safe')}</Tag> },
    { title: 'NIST', dataIndex: 'nist_standard', key: 'nist', width: 100, render: v => <Tag color="blue" style={{ borderRadius:4 }}>{v}</Tag> },
    { title: t('know.deprecation'), dataIndex: 'nist_deprecation_year', key: 'dep', width: 90,
      render: v => v ? <Tag color={v <= 2024 ? 'red' : v <= 2030 ? 'orange' : 'green'} style={{ borderRadius:4 }}>{v}</Tag> : '-' },
  ];

  const vulnData = Object.entries(vulnerabilities).map(([algo, v]) => ({ key: algo, algo, ...v }));
  const chartTheme = isDark ? 'classicDark' : 'classic';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ═══ Hero ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <ProCard className="hero-gradient" bodyStyle={{ position: 'relative', zIndex: 1 }}>
          <Row align="middle" gutter={24}>
            <Col flex="auto">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <BookOutlined style={{ fontSize: 26, color: '#6C5CE7' }} />
                <Title level={3} style={{ color: colors.text, margin: 0 }}>{t('know.title')}</Title>
              </div>
              <Paragraph style={{ color: colors.textSecondary, margin: '8px 0 0', maxWidth: 680, fontSize: 13, lineHeight: 1.8 }}>
                {t('know.desc')}
              </Paragraph>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <LockOutlined style={{ fontSize: 52, color: '#6C5CE7', filter: 'drop-shadow(0 0 16px rgba(108,92,231,0.4))' }} />
              </div>
              <div style={{ color: colors.textDim, fontSize: 10, marginTop: 6, textAlign: 'center', letterSpacing: 0.5 }}>NIST FIPS 203/204/205</div>
            </Col>
          </Row>
        </ProCard>
      </motion.div>

      {/* ═══ Tabs ═══ */}
      <Tabs type="card" activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'pqc',
          label: <span><SafetyOutlined style={{ marginRight: 4 }} />{t('know.pqc_tab')}</span>,
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
                              <Text style={{ color: colors.text, fontWeight: 700, fontSize: 16 }}>{algo.name}</Text>
                              <Tag color="blue" style={{ borderRadius: 4 }}>{algo.nist}</Tag>
                              <Tag color="green" style={{ borderRadius: 4 }}>{algo.status}</Tag>
                              <Tag style={{ borderRadius: 4 }}>{algo.category}</Tag>
                            </Space>
                          }>
                          <Paragraph style={{ color: 'var(--qs-inner-card-text3)', marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>{algo.description}</Paragraph>
                          <Row gutter={16}>
                            <Col span={14}>
                              {algo.variants?.length > 0 && (
                                <Card size="small" title={<Text style={{ color: 'var(--qs-inner-card-text)', fontSize: 13 }}>{isZh ? '参数变体' : 'Parameter Variants'}</Text>}
                                  style={{ background: 'var(--qs-inner-card-bg)', border: '1px solid var(--qs-border)', marginBottom: 12, borderRadius: 10 }}>
                                  <Table dataSource={algo.variants.map((v, i) => ({ key: i, ...v }))} size="small" pagination={false}
                                    columns={[
                                      { title: isZh ? '名称' : 'Name', dataIndex: 'name', render: v => <Text strong style={{ color: '#6C5CE7' }}>{v}</Text> },
                                      { title: isZh ? '安全级别' : 'Level', dataIndex: 'level', render: v => <Tag color="blue" style={{ borderRadius:4 }}>{v}</Tag> },
                                      ...(algo.variants[0]?.pk ? [{ title: isZh ? '公钥' : 'PK', dataIndex: 'pk' }] : []),
                                      ...(algo.variants[0]?.sk ? [{ title: isZh ? '私钥' : 'SK', dataIndex: 'sk' }] : []),
                                      ...(algo.variants[0]?.sig ? [{ title: isZh ? '签名' : 'Sig', dataIndex: 'sig' }] : []),
                                      ...(algo.variants[0]?.ct ? [{ title: isZh ? '密文' : 'CT', dataIndex: 'ct' }] : []),
                                      ...(algo.variants[0]?.ss ? [{ title: isZh ? '共享密钥' : 'SS', dataIndex: 'ss' }] : []),
                                      ...(algo.variants[0]?.output ? [{ title: isZh ? '输出' : 'Output', dataIndex: 'output' }] : []),
                                      ...(algo.variants[0]?.description ? [{ title: isZh ? '描述' : 'Desc', dataIndex: 'description' }] : []),
                                    ]} />
                                </Card>
                              )}
                              {algo.replaces && (
                                <div style={{ marginBottom: 12 }}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{isZh ? '替代算法' : 'Replaces'}: </Text>
                                  {algo.replaces.map((r, i) => <Tag key={i} color="red" style={{ marginBottom: 4, fontSize: 11, borderRadius:4 }}>{r}</Tag>)}
                                </div>
                              )}
                              {algo.libs && (
                                <Card size="small" title={<Text style={{ color: 'var(--qs-inner-card-text)', fontSize: 13 }}>{isZh ? '各语言实现' : 'Language Implementations'}</Text>}
                                  style={{ background: 'var(--qs-inner-card-bg)', border: '1px solid var(--qs-border)', borderRadius: 10 }}>
                                  <Row gutter={[8, 6]}>
                                    {Object.entries(algo.libs).map(([lang, lib]) => (
                                      <Col span={8} key={lang}>
                                        <Text style={{ color: colors.textDim, fontSize: 12 }}>{lang}: </Text>
                                        <Tag color="blue" style={{ fontSize: 11, borderRadius:4 }}>{lib}</Tag>
                                      </Col>
                                    ))}
                                  </Row>
                                </Card>
                              )}
                            </Col>
                            <Col span={10}>
                              <Card size="small" style={{ background: 'var(--qs-inner-card-bg)', border: '1px solid var(--qs-border)', marginBottom: 12, borderRadius: 10 }}>
                                <div style={{ marginBottom: 12 }}>
                                  <Text style={{ color: '#2ed573', fontWeight: 600, fontSize: 13 }}><CheckCircleOutlined style={{ marginRight: 4 }} /> {isZh ? '优势' : 'Advantages'}</Text>
                                  <ul style={{ margin: '6px 0', paddingLeft: 20 }}>
                                    {algo.pros?.map((p, i) => <li key={i} style={{ color: 'var(--qs-inner-card-text3)', fontSize: 12, marginBottom: 3 }}>{p}</li>)}
                                  </ul>
                                </div>
                                <Divider style={{ margin: '10px 0', borderColor: 'var(--qs-border)' }} />
                                <div>
                                  <Text style={{ color: '#ffa502', fontWeight: 600, fontSize: 13 }}><CloseCircleOutlined style={{ marginRight: 4 }} /> {isZh ? '局限' : 'Limitations'}</Text>
                                  <ul style={{ margin: '6px 0', paddingLeft: 20 }}>
                                    {algo.cons?.map((c, i) => <li key={i} style={{ color: 'var(--qs-inner-card-text4)', fontSize: 12, marginBottom: 3 }}>{c}</li>)}
                                  </ul>
                                </div>
                              </Card>
                              <Descriptions size="small" column={1} bordered
                                labelStyle={{ color: 'var(--qs-inner-card-text-label)', background: 'var(--qs-inner-card-bg)', fontSize: 12 }}
                                contentStyle={{ color: 'var(--qs-inner-card-text)', background: 'var(--qs-inner-row-bg)', fontSize: 12 }}>
                                <Descriptions.Item label={isZh ? '困难问题' : 'Hard Problem'}>{algo.hardness}</Descriptions.Item>
                                <Descriptions.Item label={isZh ? '安全性' : 'Security'}>{algo.security}</Descriptions.Item>
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
          label: <span><WarningOutlined style={{ marginRight: 4 }} />{t('know.vuln_tab')}</span>,
          children: (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <ProCard className="quantum-table qs-card">
                <Paragraph style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 13 }}>
                  {t('know.vuln_desc', vulnData.length)}
                  <br />
                  <Text style={{ color: colors.textDim, fontSize:12 }}>{t('know.vuln_sub')}</Text>
                </Paragraph>
                <Table dataSource={vulnData} columns={vulnColumns} size="small" pagination={false}
                  expandable={{
                    expandedRowRender: r => (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Descriptions size="small" column={1} bordered
                            labelStyle={{ color: 'var(--qs-inner-card-text-label)', background: 'var(--qs-inner-card-bg)', fontSize: 12, width: 120 }}
                            contentStyle={{ color: 'var(--qs-inner-card-text)', background: 'var(--qs-inner-row-bg)', fontSize: 12 }}>
                            <Descriptions.Item label={isZh ? '中文描述' : 'Description (ZH)'}>{r.description_zh}</Descriptions.Item>
                            <Descriptions.Item label={isZh ? '量子威胁' : 'Quantum Threat'}>{r.quantum_threat}</Descriptions.Item>
                            <Descriptions.Item label="CWE">{r.cwe_id}</Descriptions.Item>
                          </Descriptions>
                        </Col>
                        <Col span={12}>
                          <div style={{ padding: 14, background: 'var(--qs-inner-card-bg)', borderRadius: 10, border:'1px solid var(--qs-border)' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{isZh ? '威胁评估' : 'Threat Assessment'}:</Text>
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Tag className={`tag-${(r.risk||'').toLowerCase()}`} style={{ fontSize: 14, padding: '4px 14px' }}>{r.risk}</Tag>
                              {r.migration_target && <span style={{ color: colors.textDim }}>→</span>}
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
          label: <span><ClockCircleOutlined style={{ marginRight: 4 }} />{t('know.timeline_tab')}</span>,
          children: (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <ProCard className="qs-card">
                <Paragraph style={{ color: colors.textSecondary, marginBottom: 24, fontSize: 13 }}>
                  {t('know.timeline_desc')}
                </Paragraph>
                <Timeline mode="left"
                  items={timeline.map((item, idx) => ({
                    color: typeColor[item.type] || 'gray',
                    label: (
                      <div style={{ textAlign: 'right', paddingRight: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: 700, fontSize: 18 }}>{item.year}</Text>
                        <br />
                        <Tag color={typeColor[item.type]} style={{ fontSize: 10, borderRadius:4 }}>{typeLabel[item.type] || item.type}</Tag>
                      </div>
                    ),
                    children: (
                      <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * idx }} viewport={{ once: true }}>
                        <Card size="small" style={{
                          background: item.type === 'deadline' ? (isDark ? 'rgba(255,71,87,0.06)' : 'rgba(255,71,87,0.04)') : 'var(--qs-inner-card-bg)',
                          border: `1px solid ${item.type === 'deadline' ? (isDark ? 'rgba(255,71,87,0.2)' : 'rgba(255,71,87,0.15)') : 'var(--qs-border)'}`,
                          maxWidth: 520, borderRadius: 10,
                        }}>
                          <Text style={{ color: item.type === 'deadline' ? '#ff7875' : 'var(--qs-inner-card-text2)', fontSize: 13 }}>
                            {item.type === 'deadline' && <WarningOutlined style={{ marginRight: 6, color: '#ff4757' }} />}
                            {item.type === 'standard' && <SafetyOutlined style={{ marginRight: 6, color: '#2ed573' }} />}
                            {item.type === 'milestone' && <ThunderboltOutlined style={{ marginRight: 6, color: '#1e90ff' }} />}
                            {item.event}
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
