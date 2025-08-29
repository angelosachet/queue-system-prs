# Sistema de Fila com Temporizador

Este guia explica como implementar o sistema de fila com turnos temporizados e confirmação de jogadores.

## Como Funciona

1. **Entrada na Fila**: Jogadores entram na fila normalmente
2. **Turnos Temporizados**: Cada jogador tem 5 minutos para sua vez
3. **Confirmação**: Quando chega a vez do jogador, ele tem 3 minutos para confirmar
4. **Re-fila**: Se não confirmar, vai para o final da fila

## Endpoints

### 1. Iniciar Fila Temporizada
```bash
POST /timed-queue/simulator/:simulatorId/start-timed-queue
```

### 2. Ver Status da Fila
```bash
GET /timed-queue/simulator/:simulatorId/queue-status
```

### 3. Processar Próximo Jogador
```bash
POST /timed-queue/simulator/:simulatorId/next-turn
```

### 4. Confirmar Turno
```bash
POST /timed-queue/queue/:queueId/confirm
```

### 5. Simular Perda de Turno
```bash
POST /timed-queue/queue/:queueId/missed
```

## Fluxo de Exemplo

1. **Adicionar Jogadores à Fila**:
```bash
# Adicionar jogador 1
POST /queue/add-player
{
  "playerId": 1,
  "simulatorId": 1
}

# Adicionar jogador 2
POST /queue/add-player
{
  "playerId": 2,
  "simulatorId": 1
}
```

2. **Iniciar Sistema Temporizado**:
```bash
POST /timed-queue/simulator/1/start-timed-queue
```

3. **Verificar Status**:
```bash
GET /timed-queue/simulator/1/queue-status
```

4. **Confirmar Turno** (quando chegar a vez):
```bash
POST /timed-queue/queue/1/confirm
```

## Estrutura de Resposta

### Status da Fila
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "player": {
        "id": 1,
        "name": "Jogador 1"
      },
      "position": 1,
      "status": "ACTIVE",
      "turnStartAt": "2024-01-01T10:00:00.000Z",
      "expiresAt": "2024-01-01T10:03:00.000Z",
      "estimatedWaitTime": 300000
    }
  ]
}
```

## Configurações

- **Duração do Turno**: 5 minutos
- **Janela de Confirmação**: 3 minutos
- **Re-fila Automática**: Sim

## Banco de Dados

O sistema adiciona os seguintes campos à tabela Queue:

- `status`: Estado atual do jogador na fila
- `turnStartAt`: Quando começou o turno
- `confirmedAt`: Quando confirmou o turno
- `expiresAt`: Quando expira a janela de confirmação
- `missedTurns`: Quantas vezes perdeu o turno
- `totalWaitTime`: Tempo total de espera

## Instalação

1. Instalar dependência do cron:
```bash
npm install cron
```

2. Rodar migração do banco:
```bash
npx prisma migrate dev --name add_timed_queue_fields
```

3. Iniciar aplicação normalmente.