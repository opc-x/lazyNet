import {
  PowerSettingsNewRounded,
  ArrowUpwardRounded,
  ArrowDownwardRounded,
  SpeedRounded,
  DnsRounded,
  SendRounded,
  AutoAwesomeRounded,
  WifiRounded,
} from '@mui/icons-material'
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  Button,
  Grid,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Chip,
} from '@mui/material'
import React, { useState, useEffect, useRef, useMemo } from 'react'

import { useCurrentProxy } from '@/hooks/use-current-proxy'
import { useProxySelection } from '@/hooks/use-proxy-selection'
import { useSystemProxyState } from '@/hooks/use-system-proxy-state'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useProxiesData } from '@/providers/app-data-context'
import { patchClashMode, cmdGetProxyDelay } from '@/services/cmds'
import parseTraffic from '@/utils/parse-traffic'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
  actions?: Array<{
    label: string
    onClick: () => void
  }>
}

export const LazyDashboard = () => {
  const { indicator, toggleSystemProxy } = useSystemProxyState()
  const { currentProxy, primaryGroupName, mode } = useCurrentProxy()
  const {
    response: { data: traffic },
  } = useTrafficData({ enabled: true })
  const { proxies } = useProxiesData()
  const { changeProxy } = useProxySelection()

  const [inputVal, setInputVal] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: '你好！我是 lazyNet 智能网络助手。我已经帮你把所有复杂的设置隐藏起来了。\n\n你可以直接在这里用大白话命令我，比如：\n• “帮我换到日本节点”\n• “我想直连上网”\n• “网络有点卡，做个诊断”',
      timestamp: new Date(),
    },
  ])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Traffic speeds
  const [upSpeed, upUnit] = parseTraffic(traffic?.up || 0)
  const [downSpeed, downUnit] = parseTraffic(traffic?.down || 0)

  // Latency display
  const currentLatency = useMemo(() => {
    if (!currentProxy?.history || currentProxy.history.length === 0) return null
    const lastHistory = currentProxy.history[currentProxy.history.length - 1]
    return lastHistory.delay > 0 && lastHistory.delay < 1000000
      ? `${lastHistory.delay}ms`
      : '超时'
  }, [currentProxy])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simple local natural language command interpreter
  const handleSendCommand = () => {
    if (!inputVal.trim()) return

    const userText = inputVal.trim()
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputVal('')
    setIsAiLoading(true)

    // Simulate AI response delay
    setTimeout(() => {
      processCommand(userText)
    }, 600)
  }

  const processCommand = async (text: string) => {
    const query = text.toLowerCase()
    let aiText = ''
    let actions: Message['actions'] = []

    // 1. Direct / Rule / Global Mode switches
    if (
      query.includes('直连') ||
      query.includes('direct') ||
      query.includes('不代理')
    ) {
      try {
        await patchClashMode('direct')
        aiText =
          '好的，已为你切换到【直连模式】。现在国内外的网络流量都将不经过代理节点。'
      } catch (ignoreErr) {
        aiText = '切换直连模式失败了，请稍后重试。'
      }
    } else if (query.includes('全局') || query.includes('global')) {
      try {
        await patchClashMode('global')
        aiText =
          '好的，已为你切换到【全局模式】。现在所有的网络流量都将经过你选择 the 代理节点。'
      } catch (ignoreErr) {
        aiText = '切换全局模式失败了，请稍后重试。'
      }
    } else if (
      query.includes('规则') ||
      query.includes('rule') ||
      query.includes('分流')
    ) {
      try {
        await patchClashMode('rule')
        aiText =
          '好的，已为你切换到【规则分流模式】。AI 将自动为你分配路由：国内流量直连，国外及被屏蔽网站自动走代理。'
      } catch (ignoreErr) {
        aiText = '切换规则模式失败了，请稍后重试。'
      }
    }
    // 2. Node changes based on country names
    else if (
      query.includes('节点') ||
      query.includes('换') ||
      query.includes('切') ||
      query.includes('香港') ||
      query.includes('hk') ||
      query.includes('日本') ||
      query.includes('japan') ||
      query.includes('jp') ||
      query.includes('新加坡') ||
      query.includes('singapore') ||
      query.includes('sg') ||
      query.includes('美国') ||
      query.includes('us') ||
      query.includes('america') ||
      query.includes('台湾') ||
      query.includes('tw') ||
      query.includes('韩国') ||
      query.includes('kr')
    ) {
      let targetCountry = ''
      if (query.includes('香港') || query.includes('hk')) targetCountry = '香港'
      else if (query.includes('日本') || query.includes('jp'))
        targetCountry = '日本'
      else if (query.includes('新加坡') || query.includes('sg'))
        targetCountry = '新加坡'
      else if (query.includes('美国') || query.includes('us'))
        targetCountry = '美国'
      else if (query.includes('台湾') || query.includes('tw'))
        targetCountry = '台湾'
      else if (query.includes('韩国') || query.includes('kr'))
        targetCountry = '韩国'

      if (targetCountry) {
        // Find matching nodes from records
        if (proxies?.records) {
          const allNodes = Object.keys(proxies.records)
          const matchedNodes = allNodes.filter(
            (name) =>
              name.toLowerCase().includes(targetCountry) ||
              (targetCountry === '香港' && name.toLowerCase().includes('hk')) ||
              (targetCountry === '日本' && name.toLowerCase().includes('jp')) ||
              (targetCountry === '新加坡' &&
                name.toLowerCase().includes('sg')) ||
              (targetCountry === '美国' &&
                (name.toLowerCase().includes('us') ||
                  name.toLowerCase().includes('united states'))) ||
              (targetCountry === '台湾' && name.toLowerCase().includes('tw')) ||
              (targetCountry === '韩国' && name.toLowerCase().includes('kr')),
          )

          if (matchedNodes.length > 0) {
            // Find the one with lowest delay, or just the first one
            const bestNode = matchedNodes[0]
            try {
              changeProxy(
                primaryGroupName || 'GLOBAL',
                bestNode,
                currentProxy?.name,
              )
              aiText = `好的，我找到包含【${targetCountry}】的节点了。已为你成功切换至节点：\n👉 **${bestNode}**`
            } catch (ignoreErr) {
              aiText = `切换至 ${bestNode} 失败了。`
            }
          } else {
            aiText = `我在你的订阅配置文件里找了一圈，没发现名字包含【${targetCountry}】的节点。你要不要试试看其他节点？`
          }
        } else {
          aiText = '目前没有加载任何配置文件，请先在高级模式里导入订阅。'
        }
      } else {
        // Just general change node command
        if (proxies?.records) {
          const allNodes = Object.keys(proxies.records).filter(
            (n) => n !== 'DIRECT' && n !== 'REJECT',
          )
          if (allNodes.length > 0) {
            const randomNode =
              allNodes[Math.floor(Math.random() * allNodes.length)]
            actions = [
              {
                label: `切换至 ${randomNode}`,
                onClick: () => {
                  changeProxy(
                    primaryGroupName || 'GLOBAL',
                    randomNode,
                    currentProxy?.name,
                  )
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `ai-action-${Date.now()}`,
                      sender: 'ai',
                      text: `已为你切换至：${randomNode}`,
                      timestamp: new Date(),
                    },
                  ])
                },
              },
            ]
            aiText =
              '你想换到哪个国家？你可以直接对我说“帮我换日本节点”。或者我可以随机帮你推荐一个节点：'
          } else {
            aiText = '目前没有可用节点。'
          }
        } else {
          aiText = '目前没有加载任何配置文件。'
        }
      }
    }
    // 3. Network Delay Speed check
    else if (
      query.includes('测速') ||
      query.includes('卡') ||
      query.includes('延迟') ||
      query.includes('卡顿') ||
      query.includes('慢')
    ) {
      if (currentProxy?.name) {
        aiText = `正在为当前活动节点【${currentProxy.name}】进行网络延迟测速...`
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-temp-${Date.now()}`,
            sender: 'ai',
            text: aiText,
            timestamp: new Date(),
          },
        ])

        try {
          const res = await cmdGetProxyDelay(currentProxy.name, 5000)
          const delay = res?.delay
          if (delay && delay < 1000000) {
            aiText = `测速完成！当前最优节点延迟为 **${delay}ms**，网络状态良好。如果还是觉得慢，可以说“帮我换个节点”。`
          } else {
            aiText =
              '测速超时！当前节点可能失效或网络环境不佳。建议你对我说“换个节点”来尝试自愈连接。'
          }
        } catch {
          aiText = '测速时发生了一些小状况，当前节点延迟可能偏高或已失效。'
        }
      } else {
        aiText =
          '检测到你尚未连接或没有选择任何代理节点，请先点击屏幕上方的“智能连接”大按钮开启代理。'
      }
    }
    // 4. Quick Diagnostics
    else if (
      query.includes('诊断') ||
      query.includes('检查') ||
      query.includes('连不上') ||
      query.includes('坏了') ||
      query.includes('故障')
    ) {
      const isCoreActive = currentProxy !== null
      const isProxyEnabled = indicator

      aiText =
        `📋 **lazyNet 智能自检报告**\n\n` +
        `• **内核运行状态**: ${isCoreActive ? '🟢 正常运行中' : '🔴 未运行'}\n` +
        `• **系统代理接管**: ${isProxyEnabled ? '🟢 已接管系统网络' : '🟡 未接管'}\n` +
        `• **当前选定节点**: **${currentProxy?.name || '无'}** (延迟: ${currentLatency || '未知'})\n` +
        `• **当前路由模式**: **${mode.toUpperCase()}**\n\n` +
        `${!isProxyEnabled ? '💡 检测到代理接管已关闭。你可以点击上方的大圆钮一键开启！' : '💡 系统一切正常！如果仍无法打开目标网页，可能当前节点已失效，你可以对我说“帮我换日本节点”来更换选路。'}`
    }
    // 5. Default Fallbacks
    else {
      aiText =
        '我不太听得懂这个命令呢。你可以试着问我：\n• “香港节点”或“日本节点”来换线；\n• “我想直连上网”或“规则模式”切换路由；\n• “诊断一下网络”来做个全面检查。'
    }

    setMessages((prev) => {
      // Remove any temporary loading or pending message
      const filtered = prev.filter((m) => !m.id.startsWith('ai-temp-'))
      return [
        ...filtered,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiText,
          timestamp: new Date(),
          actions: actions.length > 0 ? actions : undefined,
        },
      ]
    })
    setIsAiLoading(false)
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner: Grid of clean stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              background: 'background.paper',
            }}
          >
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: indicator
                  ? 'primary.main'
                  : 'action.disabledBackground',
                color: indicator ? 'primary.contrastText' : 'text.disabled',
                mr: 2,
                display: 'flex',
              }}
            >
              <WifiRounded />
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                系统网络代理状态
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {indicator ? '🟢 智能托管中' : '⚪️ 未接管系统'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              background: 'background.paper',
            }}
          >
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                mr: 2,
                display: 'flex',
              }}
            >
              <DnsRounded />
            </Box>
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                活动代理节点 ({mode.toUpperCase()})
              </Typography>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                {currentProxy?.name || '未连接'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              background: 'background.paper',
            }}
          >
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'info.main',
                color: 'info.contrastText',
                mr: 2,
                display: 'flex',
              }}
            >
              <SpeedRounded />
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                节点连接延迟 / 实时下载速度
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                ⚡️ {currentLatency ? currentLatency : '测速中'} / ⬇️ {downSpeed}{' '}
                {downUnit}/s
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main content grid: Left Connect Button, Right AI Chat */}
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Side: Large Connect Button with animated gradient glow */}
        <Grid
          size={{ xs: 12, md: 5 }}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 4,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              background: 'background.paper',
            }}
          >
            {/* Glowing background aura when connected */}
            {indicator && (
              <Box
                sx={{
                  position: 'absolute',
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0) 70%)',
                  animation: 'pulse 3s infinite alternate',
                  zIndex: 0,
                  pointerEvents: 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                    '100%': { transform: 'scale(1.2)', opacity: 1 },
                  },
                }}
              />
            )}

            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, zIndex: 1 }}>
              {indicator ? '托管中，网络已畅通' : '网络代理已断开'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 5, textAlign: 'center', maxWidth: 280, zIndex: 1 }}
            >
              {indicator
                ? 'lazyNet 正在后台静默守护，所有网站分流和测速已由 AI 完成托管。'
                : '点击按钮开启极简智能连接，无缝畅联全球网站。'}
            </Typography>

            {/* Huge Round Switch Button */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <IconButton
                onClick={() => toggleSystemProxy(!indicator)}
                sx={{
                  width: 140,
                  height: 140,
                  bgcolor: indicator
                    ? 'primary.main'
                    : 'action.disabledBackground',
                  color: indicator ? 'primary.contrastText' : 'text.disabled',
                  boxShadow: indicator
                    ? '0 12px 32px rgba(99,102,241,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                    : 'none',
                  transition:
                    'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  '&:hover': {
                    bgcolor: indicator ? 'primary.dark' : 'action.selected',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <PowerSettingsNewRounded sx={{ fontSize: 64 }} />
              </IconButton>
            </Box>

            <Box sx={{ mt: 5, display: 'flex', gap: 2, zIndex: 1 }}>
              <Chip
                icon={<ArrowUpwardRounded />}
                label={`上传: ${upSpeed} ${upUnit}/s`}
                variant="outlined"
                size="small"
                color="secondary"
              />
              <Chip
                icon={<ArrowDownwardRounded />}
                label={`下载: ${downSpeed} ${downUnit}/s`}
                variant="outlined"
                size="small"
                color="primary"
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right Side: AI Assistant Panel */}
        <Grid
          size={{ xs: 12, md: 7 }}
          sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'background.paper',
              height: '100%',
              minHeight: 0, // critical for nested flex scrolling
            }}
          >
            {/* AI Assistant Header */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AutoAwesomeRounded sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  lazyNet 智能网络助理
                </Typography>
              </Box>
              <Chip
                size="small"
                label="本地极速版"
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Chat Messages Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              <List sx={{ p: 0 }}>
                {messages.map((msg) => (
                  <ListItem
                    key={msg.id}
                    disablePadding
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems:
                        msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '85%',
                        p: 2,
                        borderRadius: 3,
                        bgcolor:
                          msg.sender === 'user'
                            ? 'primary.main'
                            : 'action.selected',
                        color:
                          msg.sender === 'user'
                            ? 'primary.contrastText'
                            : 'text.primary',
                        borderBottomRightRadius: msg.sender === 'user' ? 0 : 3,
                        borderBottomLeftRadius: msg.sender === 'ai' ? 0 : 3,
                        whiteSpace: 'pre-line',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}
                      >
                        {msg.text}
                      </Typography>
                    </Box>

                    {/* Render action suggestions if any */}
                    {msg.actions && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        {msg.actions.map((act) => (
                          <Button
                            key={act.label}
                            variant="contained"
                            size="small"
                            onClick={act.onClick}
                            sx={{ borderRadius: 2 }}
                          >
                            {act.label}
                          </Button>
                        ))}
                      </Box>
                    )}

                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ mt: 0.5, px: 1, fontSize: '0.75rem' }}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </ListItem>
                ))}
                {isAiLoading && (
                  <ListItem
                    disablePadding
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: 'action.selected',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        助手正在处理你的指令...
                      </Typography>
                    </Box>
                  </ListItem>
                )}
                <div ref={chatEndRef} />
              </List>
            </Box>

            {/* Input Box */}
            <Divider />
            <Box
              sx={{
                p: 2,
                display: 'flex',
                gap: 1,
                bgcolor: 'background.default',
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendCommand()
                }}
                placeholder="用白话命令我，如：帮我切到香港节点..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSendCommand}
                disabled={!inputVal.trim() || isAiLoading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 3,
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'text.disabled',
                  },
                }}
              >
                <SendRounded />
              </IconButton>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
