import React, { useState, useRef, useEffect } from 'react';
import Layout from '@theme/Layout';
import { LuckyWheel } from '@lucky-canvas/react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 配置区域 ---
const ACCESS_PASSWORD = "666"; 
const FORMSPREE_URL = "https://formspree.io/f/xqeqbogb"; // 你的 Formspree ID

const INITIAL_PRIZES = [
  { id: 1, name: '奖品 1', color: '#FF6B6B' },
  { id: 2, name: '奖品 2', color: '#FF8E99' },
  { id: 3, name: '奖品 3', color: '#FF92AE' },
  { id: 4, name: '奖品 4', color: '#FFB3BA' },
  { id: 5, name: '奖品 5', color: '#FF6B6B' },
  { id: 6, name: '奖品 6', color: '#FF8E99' },
  { id: 7, name: '奖品 7', color: '#FF92AE' },
  { id: 8, name: '奖品 8', color: '#FFB3BA' },
];

export default function LuckyWheelPage() {
  const myLucky = useRef();
  const [step, setStep] = useState('password'); // password | exclude | wheel
  const [inputPass, setInputPass] = useState('');
  const [excludedIds, setExcludedIds] = useState([]);
  const [finalPrizes, setFinalPrizes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasParticipated, setHasParticipated] = useState(false);
  const [fingerprint, setFingerprint] = useState('');

  // 初始化：检查参与资格
  useEffect(() => {
    const id = btoa([navigator.userAgent, screen.width].join('|')).substring(0, 12);
    setFingerprint(id);
    if (localStorage.getItem(`draw_v2_${id}`)) {
      setHasParticipated(true);
    }
  }, []);

  const handleVerify = () => {
    if (inputPass === ACCESS_PASSWORD) {
      setStep('exclude');
    } else {
      alert("邀请码错误");
    }
  };

  const toggleExclude = (id) => {
    if (excludedIds.includes(id)) {
      setExcludedIds(excludedIds.filter(i => i !== id));
    } else {
      if (excludedIds.length < 2) {
        setExcludedIds([...excludedIds, id]);
      } else {
        alert("只能去掉 2 个奖品哦！");
      }
    }
  };

  const confirmSelection = () => {
    if (excludedIds.length !== 2) {
      alert("请先排除 2 个奖品");
      return;
    }
    const remaining = INITIAL_PRIZES.filter(p => !excludedIds.includes(p.id));
    setFinalPrizes(remaining);
    setStep('wheel');
  };

  const startSpin = () => {
    if (hasParticipated) {
      alert("⚠️ 您已参与过，请勿重复操作。");
      return;
    }
    if (isSubmitting) return;

    myLucky.current.play();
    setTimeout(() => {
      // 6个奖品等概率
      const index = Math.floor(Math.random() * 6);
      myLucky.current.stop(index);
    }, 2500);
  };

  const onEnd = async (prize) => {
    const prizeName = prize.fonts[0].text;
    setIsSubmitting(true);
    try {
      const response = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prize: prizeName, 
          uid: fingerprint,
          time: new Date().toLocaleString() 
        }),
      });
      if (response.ok) {
        localStorage.setItem(`draw_v2_${fingerprint}`, 'true');
        setHasParticipated(true);
        alert(`🎉 恭喜获得：${prizeName}！登记已完成。`);
      }
    } catch (e) {
      alert('保存失败，请截图保留中奖界面');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="幸运抽奖" noFooter={true}>
      <div style={styles.container}>
        <div style={styles.bgGlow} />

        <AnimatePresence mode="wait">
          {/* 步骤 1: 密码弹窗 */}
          {step === 'password' && (
            <motion.div key="pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.modalContent}>
                <div style={{ fontSize: '44px', marginBottom: '10px' }}>🎁</div>
                <h2 style={styles.modalTitle}>入场凭证</h2>
                <p style={styles.modalSubTitle}>请输入专属邀请码以开启抽奖</p>
                <input 
                  type="text" 
                  value={inputPass} 
                  onChange={(e) => setInputPass(e.target.value)} 
                  style={styles.input} 
                  placeholder="邀请码" 
                />
                <button onClick={handleVerify} style={styles.btnGradient}>确认进入</button>
              </motion.div>
            </motion.div>
          )}

          {/* 步骤 2: 排除奖品（一行一个） */}
          {step === 'exclude' && (
            <motion.div key="exclude" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.modalOverlay}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.modalContent}>
                <h2 style={styles.modalTitle}>排除奖品</h2>
                <p style={styles.modalSubTitle}>请勾选 2 个你认为【不会中】的奖品</p>
                
                <div style={styles.prizeGrid}>
                  {INITIAL_PRIZES.map(p => (
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      key={p.id} 
                      onClick={() => toggleExclude(p.id)} 
                      style={{
                        ...styles.prizeItem,
                        borderColor: excludedIds.includes(p.id) ? '#FF6B6B' : '#f0f0f0',
                        background: excludedIds.includes(p.id) ? 'rgba(255,107,107,0.03)' : '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '10px' }}>🎁</span>
                        <span style={{ color: '#333', fontWeight: excludedIds.includes(p.id) ? 'bold' : 'normal' }}>{p.name}</span>
                      </div>
                      <div style={{
                        ...styles.checkbox,
                        background: excludedIds.includes(p.id) ? '#FF6B6B' : 'transparent',
                        borderColor: excludedIds.includes(p.id) ? '#FF6B6B' : '#ddd',
                      }}>
                        {excludedIds.includes(p.id) && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button onClick={confirmSelection} style={{
                  ...styles.btnGradient,
                  opacity: excludedIds.length === 2 ? 1 : 0.4,
                  marginTop: '10px'
                }}>
                  {excludedIds.length === 2 ? "生成我的专属转盘" : `还需选择 ${2 - excludedIds.length} 个`}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 步骤 3: 转盘主页面 */}
        {step === 'wheel' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', zIndex: 1 }}>
            <h1 style={styles.title}>LUCKY WHEEL</h1>
            <div style={styles.wheelWrapper}>
              <LuckyWheel
                ref={myLucky}
                width="310px"
                height="310px"
                blocks={[{ padding: '10px', background: '#F0F0F0', borderRadius: '50%' }]}
                prizes={finalPrizes.map(p => ({
                  background: p.color,
                  fonts: [{ text: p.name, top: '15%', color: '#fff', fontWeight: 'bold' }]
                }))}
                buttons={[{
                  radius: '35%',
                  background: '#fff',
                  pointer: true,
                  fonts: [{ text: 'GO', color: '#FF6B6B', top: '-10px', fontWeight: '900', fontSize: '18px' }]
                }]}
                onStart={startSpin}
                onEnd={onEnd}
              />
            </div>
            {hasParticipated && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.warnText}>
                    您今日已参与，请明日再来 ✨
                </motion.p>
            )}
            <p style={{ marginTop: '30px', color: '#BBB', fontSize: '12px' }}>ID: {fingerprint}</p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: '-apple-system, sans-serif', overflow: 'hidden' },
  bgGlow: { position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 10%, rgba(255,107,107,0.08) 0%, rgba(255,255,255,0) 60%)', zIndex: 0 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' },
  modalContent: { background: '#ffffff', padding: '35px 25px', borderRadius: '32px', textAlign: 'center', width: '90%', maxWidth: '380px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.02)' },
  modalTitle: { color: '#333', marginBottom: '5px', fontWeight: '900', fontSize: '24px' },
  modalSubTitle: { color: '#999', marginBottom: '25px', fontSize: '14px' },
  input: { width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #F0F0F0', background: '#F8F9FA', color: '#333', fontSize: '16px', marginBottom: '20px', outline: 'none', textAlign: 'center' },
  btnGradient: { width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E99 100%)', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(255,107,107,0.3)', transition: '0.3s' },
  prizeGrid: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px', maxHeight: '380px', overflowY: 'auto', padding: '4px' },
  prizeItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f0f0f0', cursor: 'pointer', transition: 'all 0.2s ease' },
  checkbox: { width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '32px', letterSpacing: '6px', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E99 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '40px', fontWeight: '900' },
  wheelWrapper: { padding: '15px', background: '#fff', borderRadius: '50%', boxShadow: '0 20px 60px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.01)' },
  warnText: { marginTop: '25px', color: '#FF6B6B', fontWeight: 'bold', letterSpacing: '1px' }
};