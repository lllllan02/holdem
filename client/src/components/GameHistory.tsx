import { useState, useEffect } from 'react'
import { Button, Modal, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface GameRecord {
  roundId: string
  startTime: number
  endTime: number
  dealerPos: number
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
    totalBet: number
    status: string
    handRank: string
  }>
  winners: Array<{
    userId: string
    name: string
    position: number
    winAmount: number
    handRank: string
  }>
}

interface GameHistoryProps {
  open: boolean
  onClose: () => void
}

const GameHistory: React.FC<GameHistoryProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<GameRecord[]>([])

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

  console.log('当前记录数据:', records)

  const columns: ColumnsType<GameRecord> = [
    {
      title: '对局时间',
      key: 'time',
      render: (_, record) => (
        <Tooltip title={`开始: ${dayjs(record.startTime * 1000).format('HH:mm:ss')}\n结束: ${dayjs(record.endTime * 1000).format('HH:mm:ss')}`}>
          {dayjs(record.startTime * 1000).format('MM-DD HH:mm')}
        </Tooltip>
      ),
      width: 100,
      align: 'center',
    },
    {
      title: '底池',
      dataIndex: 'pot',
      key: 'pot',
      render: (pot) => `$${pot}`,
      width: 80,
      align: 'center',
    },
    {
      title: '玩家',
      key: 'players',
      render: (_, record) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {record.players.map((player) => {
            const isWinner = record.winners.some(w => w.userId === player.userId)
            const chipChange = player.finalChips - player.initChips
            return (
              <Tag
                key={player.userId}
                color={isWinner ? 'success' : 'default'}
                style={{ margin: 0 }}
              >
                {player.name} ({chipChange > 0 ? '+' : ''}{chipChange})
              </Tag>
            )
          })}
        </div>
      ),
    },
    {
      title: '获胜者',
      key: 'winners',
      render: (_, record) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {record.winners.map((winner) => (
            <Tooltip key={winner.userId} title={`牌型: ${winner.handRank}`}>
              <Tag color="success" style={{ margin: 0 }}>
                {winner.name} (+{winner.winAmount})
              </Tag>
            </Tooltip>
          ))}
        </div>
      ),
      width: 200,
    },
  ]

  return (
    <Modal
      title="历史对局"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Table
        columns={columns}
        dataSource={records}
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