# Servis Automat PWA

Современное веб-приложение (PWA) для управления сервисными заявками клуба.

## Описание проекта

Приложение предназначено для автоматизации процессов обработки сервисных заявок в игровых клубах. Система поддерживает:
- Создание и отслеживание заявок на обслуживание автоматов
- Управление статусами заявок (новые, в обработке, ожидают запчасти, ожидают налоговые документы, закрытые)
- Назначение технических специалистов на заявки
- Система ролей: администратор, технический специалист, клуб
- Отчетность и аналитика
- Мобильно-ориентированный интерфейс (PWA)

## Технологический стек

- **Frontend**: React + TypeScript + Vite
- **Стилизация**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Развертывание**: Netlify
- **Мобильная поддержка**: PWA (Progressive Web App)

## Структура проекта

```
servis-automat-pwa/          # Frontend приложение
├── src/                    # Исходный код React приложения
│   ├── components/         # React компоненты
│   ├── pages/             # Страницы приложения
│   ├── lib/               # Утилиты и конфигурация
│   └── hooks/             # React hooks
├── public/                 # Статические файлы
├── package.json           # Зависимости проекта
└── vite.config.ts         # Конфигурация Vite

supabase/                   # Backend конфигурация
└── functions/             # Supabase Edge Functions
    ├── dashboard-stats/   # Функция получения статистики
    ├── tickets-create/    # Функция создания заявок
    ├── auth-login/        # Функция авторизации
    └── auth-refresh/      # Функция обновления токена
```

## Установка и запуск

### Требования
- Node.js 18+
- npm или pnpm
- Supabase CLI

### Установка зависимостей
```bash
cd servis-automat-pwa
npm install
# или
pnpm install
```

### Настройка переменных окружения
Создайте файл `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Запуск в режиме разработки
```bash
npm run dev
# или
pnpm dev
```

Приложение будет доступно по адресу: http://localhost:5173

### Сборка для продакшена
```bash
npm run build
# или
pnpm build
```

### Развёртывание Supabase функций
```bash
cd servis-automat-pwa
supabase functions deploy dashboard-stats
supabase functions deploy tickets-create
supabase functions deploy auth-login
supabase functions deploy auth-refresh
```

## Основной функционал

### Авторизация
- Вход по email и паролю
- Система ролей: admin, technician, hall
- Автоматическое обновление токена

### Управление заявками
- Создание новых заявок
- Просмотр списка заявок
- Изменение статусов заявок
- Назначение техников
- Загрузка фотографий

### Дашборд и отчётность
- Общая статистика по заявкам
- Статистика по клубам
- Статистика по статусам
- Визуализация данных

### Мобильная оптимизация
- Адаптивный дизайн
- PWA возможности
- Оптимизация для сенсорного экрана
- Поддержка оффлайн режима

## Структура данных

### Пользователи (users)
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'hall';
  club_id: number | null;
  active: boolean;
}
```

### Клубы (clubs)
```typescript
interface Club {
  id: number;
  name: string;
  city: string;
  address: string;
}
```

### Заявки (tickets)
```typescript
interface Ticket {
  id: number;
  club_id: number;
  title: string;
  description: string;
  status: 'novo' | 'u_tijeku' | 'čeka se rezervni dio' | 'čeka se porezna' | 'zatvoreno';
  assigned_technician_id: number | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
  // Дополнительные поля workflow
  serial_number: string;
  inventory_number: string;
  employee_name?: string;
  manufacturer?: string;
  game_name?: string;
  can_play?: 'da' | 'ne';
  request_number?: string;
  comments?: string;
}
```

## Статусы заявок

- **novo** (новые) - Первоначальный статус для всех заявок
- **u_tijeku** (в обработке) - Заявка взята в работу
- **čeka se rezervni dio** (ожидают запчасти) - Ожидается поставка запчастей
- **čeka se porezna** (ожидают налоговые документы) - Ожидаются документы от налоговой
- **zatvoreno** (закрытые) - Заявка завершена

## Версия

Текущая версия включает исправления для корректного отображения статистики в дашборде.

## Развёртывание

**Live Demo**: https://0dc85vbbcm4x.space.minimax.io

**Старая версия**: https://yrkq63r4vtmi.space.minimax.io

## Автор

MiniMax Agent
Дата последнего обновления: 2025-11-11