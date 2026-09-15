const state = {
  viewDate: new Date(),
  selectedDate: toDateKey(new Date()),
  reminders: JSON.parse(localStorage.getItem('daymark-reminders') || '[]')
};

const calendarGrid = document.querySelector('#calendarGrid');
const monthHeading = document.querySelector('#monthHeading');
const reminderForm = document.querySelector('#reminderForm');
const reminderDate = document.querySelector('#reminderDate');
const reminderTitle = document.querySelector('#reminderTitle');
const upcomingList = document.querySelector('#upcomingList');
const reminderCount = document.querySelector('#reminderCount');
const toast = document.querySelector('#toast');

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey, options) {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(`${dateKey}T12:00:00`));
}

function saveReminders() {
  localStorage.setItem('daymark-reminders', JSON.stringify(state.reminders));
}

function renderCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  monthHeading.innerHTML = `${formatDate(`${year}-${String(month + 1).padStart(2, '0')}-01`, { month: 'long' })} <em>${year}</em>`;
  calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const todayKey = toDateKey(new Date());

  for (let cell = 0; cell < totalCells; cell += 1) {
    const dayNumber = cell - firstDay + 1;
    let dateKey;
    let visibleNumber = dayNumber;
    let isMuted = false;

    if (dayNumber < 1) {
      dateKey = toDateKey(new Date(year, month - 1, previousDays + dayNumber));
      visibleNumber = previousDays + dayNumber;
      isMuted = true;
    } else if (dayNumber > daysInMonth) {
      dateKey = toDateKey(new Date(year, month + 1, dayNumber - daysInMonth));
      visibleNumber = dayNumber - daysInMonth;
      isMuted = true;
    } else {
      dateKey = toDateKey(new Date(year, month, dayNumber));
    }

    const day = document.createElement('button');
    day.type = 'button';
    day.className = `day${isMuted ? ' muted' : ''}${dateKey === todayKey ? ' today' : ''}${dateKey === state.selectedDate ? ' selected' : ''}`;
    day.setAttribute('role', 'gridcell');
    day.setAttribute('aria-label', formatDate(dateKey, { dateStyle: 'full' }));
    day.innerHTML = `<span class="day-number">${visibleNumber}</span>`;

    const events = state.reminders.filter((reminder) => reminder.date === dateKey);
    if (events.length) {
      const eventList = document.createElement('div');
      eventList.className = 'day-events';
      events.slice(0, 3).forEach((event) => {
        const chip = document.createElement('span');
        chip.className = 'event-chip';
        chip.textContent = event.title;
        chip.title = event.title;
        eventList.appendChild(chip);
      });
      day.appendChild(eventList);
    }

    day.addEventListener('click', () => selectDate(dateKey));
    calendarGrid.appendChild(day);
  }
}

function selectDate(dateKey) {
  state.selectedDate = dateKey;
  reminderDate.value = dateKey;
  state.viewDate = new Date(`${dateKey}T12:00:00`);
  renderCalendar();
  reminderTitle.focus();
}

function renderUpcoming() {
  const upcoming = [...state.reminders]
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .filter((reminder) => reminder.date >= toDateKey(new Date()))
    .slice(0, 5);

  reminderCount.textContent = state.reminders.length;
  upcomingList.innerHTML = '';
  if (!upcoming.length) {
    upcomingList.innerHTML = '<p class="empty-state">Nothing on the horizon yet.<br>Make your first mark above.</p>';
    return;
  }

  upcoming.forEach((reminder) => {
    const item = document.createElement('div');
    item.className = 'reminder-item';
    const dateLabel = formatDate(reminder.date, { month: 'short', day: 'numeric' }).replace(' ', '<br>');
    const timeLabel = reminder.time ? formatTime(reminder.time) : 'All day';
    item.innerHTML = `<span class="reminder-date">${dateLabel}</span><div><div class="reminder-title"></div><div class="reminder-time">${timeLabel}</div></div><button class="delete-button" type="button" aria-label="Delete reminder">×</button>`;
    item.querySelector('.reminder-title').textContent = reminder.title;
    item.querySelector('.delete-button').addEventListener('click', () => deleteReminder(reminder.id));
    upcomingList.appendChild(item);
  });
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function deleteReminder(id) {
  state.reminders = state.reminders.filter((reminder) => reminder.id !== id);
  saveReminders();
  renderCalendar();
  renderUpcoming();
  showToast('Reminder removed');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

reminderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(reminderForm);
  const reminder = { id: crypto.randomUUID(), title: formData.get('title').trim(), date: formData.get('date'), time: formData.get('time') };
  state.reminders.push(reminder);
  state.selectedDate = reminder.date;
  state.viewDate = new Date(`${reminder.date}T12:00:00`);
  saveReminders();
  renderCalendar();
  renderUpcoming();
  reminderForm.reset();
  reminderDate.value = state.selectedDate;
  showToast('Reminder added');
});

document.querySelector('#previousMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
document.querySelector('#todayButton').addEventListener('click', () => { const today = new Date(); state.selectedDate = toDateKey(today); state.viewDate = today; reminderDate.value = state.selectedDate; renderCalendar(); });
document.querySelector('#notificationButton').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('Notifications are not supported here'); return; }
  const permission = await Notification.requestPermission();
  showToast(permission === 'granted' ? 'Browser reminders enabled' : 'Notifications remain off');
});

reminderDate.value = state.selectedDate;
renderCalendar();
renderUpcoming();
