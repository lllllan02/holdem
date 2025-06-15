import React, { useEffect, useState } from 'react'
import { Modal, Table, Tag, Button, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface GameRecord {
  roundId: string
  startTime: number
  endTime: number
  pot: number
  communityCards: Array<{
    suit: string
    rank: string
  }>
  players: Array<{
    userId: string
    name: string
    position: number
    initChips: number
    finalChips: number
    chipsChange: number
    totalBet: number
    status: string
    handRank: string
    holeCards: Array<{
      suit: string
      rank: string
    }>
  }>
  winners: Array<{
    userId: string
    name: string
    position: number
    winAmount: number
    handRank: string
    holeCards: Array<{
      suit: string
      rank: string
    }>
  }>
}

interface TableDataType {
  roundId: string
  playerNames: React.ReactNode
  playerCards: React.ReactNode
  communityCards: React.ReactNode
  pot: number | null
  time: { props: { children: string } } | null
  actions: React.ReactNode | null
}

interface GameHistoryProps {
  open: boolean
  onClose: () => void
}

const GameHistory: React.FC<GameHistoryProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<GameRecord[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchRecords = async () => {
    try {
      console.log('开始获取历史记录...')
      setLoading(true)
      const response = await fetch('/game/records?days=7&limit=50')
      console.log('API响应状态:', response.status)
      if (!response.ok) {
        throw new Error('获取历史记录失败')
      }
      const data = await response.json()
      console.log('获取到的历史记录数据:', data)
      setRecords(data.records || [])
    } catch (error) {
      console.error('获取历史记录失败:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('GameHistory组件打开状态:', open)
    if (open) {
      fetchRecords()
    }
  }, [open])

  const toggleExpand = (roundId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roundId)) {
        newSet.delete(roundId)
      } else {
        newSet.add(roundId)
      }
      return newSet
    })
  }

  const renderCard = (card: { suit: string; rank: string }) => {
    const suitSymbols: { [key: string]: string } = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    }
    const suitColors: { [key: string]: string } = {
      'hearts': '#ff0000',
      'diamonds': '#ff0000',
      'clubs': '#000000',
      'spades': '#000000'
    }
    return (
      <div style={{
        width: '32px',
        height: '45px',
        background: 'white',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ color: suitColors[card.suit] }}>
          {card.rank}
        </div>
        <div style={{ color: suitColors[card.suit], fontSize: '15px' }}>
          {suitSymbols[card.suit]}
        </div>
      </div>
    )
  }

  const renderPlayerName = (record: GameRecord) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        {record.winners.map((winner) => (
          <div key={winner.userId} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>{winner.name}</span>
            <Tag color="success" style={{ margin: 0 }}>+{winner.winAmount}</Tag>
          </div>
        ))}
      </div>
    )
  }

  const renderPlayerCards = (record: GameRecord) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        {record.winners.map((winner) => (
          <div key={winner.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <Tag color="success" style={{ margin: 0, fontSize: '12px' }}>{winner.handRank}</Tag>
            <div style={{ display: 'flex', gap: '4px' }}>
              {winner.holeCards.map((card, index) => (
                <div key={index}>{renderCard(card)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderSinglePlayer = (player: GameRecord['players'][0], record: GameRecord) => {
    return {
      roundId: `${record.roundId}-${player.userId}`,
      playerNames: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
          <span>{player.name}</span>
          <Tag 
            color={player.chipsChange > 0 ? 'success' : 'error'} 
            style={{ margin: 0 }}
          >
            {player.chipsChange > 0 ? '+' : ''}{player.chipsChange}
          </Tag>
        </div>
      ),
      playerCards: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          {player.status === 'folded' ? (
            <Tag color="error" style={{ margin: 0 }}>弃牌</Tag>
          ) : (
            <>
              <Tag color="default" style={{ margin: 0, fontSize: '12px' }}>{player.handRank}</Tag>
              <div style={{ display: 'flex', gap: '4px' }}>
                {player.holeCards.map((card, index) => (
                  <div key={index}>{renderCard(card)}</div>
                ))}
              </div>
            </>
          )}
        </div>
      ),
      communityCards: null,
      pot: null,
      time: null,
      actions: null
    }
  }

  const getTableData = () => {
    const data: any[] = []
    records.forEach(record => {
      // 添加获胜者记录
      data.push({
        roundId: record.roundId,
        playerNames: renderPlayerName(record),
        playerCards: renderPlayerCards(record),
        communityCards: (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
            {record.communityCards.map((card, index) => (
              <div key={index}>{renderCard(card)}</div>
            ))}
          </div>
        ),
        pot: record.pot,
        time: (
          <Tooltip title={`开始时间：${dayjs(record.startTime * 1000).format('YYYY-MM-DD HH:mm:ss')}\n结束时间：${dayjs(record.endTime * 1000).format('YYYY-MM-DD HH:mm:ss')}`}>
            {dayjs(record.startTime * 1000).format('MM-DD HH:mm:ss')}
          </Tooltip>
        ),
        actions: renderExpandButton(record)
      })

      // 如果展开，添加其他玩家记录
      if (expandedRows.has(record.roundId)) {
        record.players
          .filter(player => !record.winners.some(w => w.userId === player.userId))
          .forEach(player => {
            data.push(renderSinglePlayer(player, record))
          })
      }
    })
    return data
  }

  const renderExpandButton = (record: GameRecord) => {
    const isExpanded = expandedRows.has(record.roundId)
    return (
      <Button 
        type="link" 
        size="small" 
        onClick={() => toggleExpand(record.roundId)}
        style={{ padding: '0 8px', whiteSpace: 'nowrap', minWidth: '50px' }}
      >
        {isExpanded ? '收起' : '其他'}
      </Button>
    )
  }

  const columns: ColumnsType<TableDataType> = [
    {
      title: '玩家',
      key: 'playerNames',
      dataIndex: 'playerNames',
      width: '20%',
      align: 'center',
    },
    {
      title: '手牌',
      key: 'playerCards',
      dataIndex: 'playerCards',
      width: '20%',
      align: 'center',
    },
    {
      title: '公共牌',
      key: 'communityCards',
      dataIndex: 'communityCards',
      width: '25%',
      align: 'center',
      render: (content) => content || <div style={{ height: '45px' }} />,
    },
    {
      title: '底池',
      dataIndex: 'pot',
      key: 'pot',
      render: (pot) => pot ? `$${pot}` : '',
      width: '12%',
      align: 'center',
    },
    {
      title: '时间',
      key: 'time',
      dataIndex: 'time',
      width: '15%',
      align: 'center',
    },
    {
      title: '',
      key: 'actions',
      dataIndex: 'actions',
      width: '8%',
      align: 'center',
    },
  ]

  return (
    <Modal
      title="历史对局"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <Table
        columns={columns}
        dataSource={getTableData()}
        rowKey="roundId"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          size: 'small',
          showTotal: (total) => `共 ${total} 条记录`
        }}
        size="small"
        style={{ marginTop: '-12px' }}
        locale={{
          emptyText: '暂无对局记录'
        }}
      />
    </Modal>
  )
}

export default GameHistory 