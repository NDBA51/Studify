import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBjwFtxxk5kmQqQM9wJ9Qf5D8U1fXjlExE",
  authDomain: "student-profile-website.firebaseapp.com",
  databaseURL: "https://student-profile-website-default-rtdb.firebaseio.com",
  projectId: "student-profile-website",
  storageBucket: "student-profile-website.appspot.com",
  messagingSenderId: "1008716824695",
  appId: "1:1008716824695:web:6663b050393e426e12c672",
  measurementId: "G-C5E0PSV3ML",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const EMAILJS_PUBLIC_KEY = 'GiiYwF-mWFul0mskY';
const EMAILJS_SERVICE_ID = 'service_rpn582t';
const EMAILJS_TEMPLATE_ID = 'template_p4qsg2m';

emailjs.init(EMAILJS_PUBLIC_KEY);


async function checkAndSendReminders(userId) {
  try {
    const userSnapshot = await get(ref(database, `users/${userId}`));
    if (!userSnapshot.exists()) {

      return;
    }

    const userData = userSnapshot.val();
    const sections = ['assignments', 'quizzes'];

    for (const section of sections) {
      const items = userData[section] || {};
      for (const [itemId, item] of Object.entries(items)) {


        if (!item.dueDate) {
          continue;
        }
        if (!item.reminderSettings?.enabled) {
          continue;
        }
        if (item.reminderSent) {
          continue;
        }
        const dueDate = new Date(item.dueDate);
        const now = new Date();
        const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
        const reminderTimeframe = item.reminderSettings?.timeframe || 6;
        if (hoursUntilDue <= reminderTimeframe && hoursUntilDue > 0) {

          const templateParams = {
            user_name: userData.name,
            user_email: userData.email,
            assignment_name: item.title,
            due_date: dueDate.toLocaleString(),
            hours_remaining: Math.round(hoursUntilDue)
          };

          try {
            const response = await emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID,
              templateParams,
              EMAILJS_PUBLIC_KEY
            );
            await update(ref(database, `users/${userId}/${section}/${itemId}`), {
              reminderSent: true,
              'reminderSettings.lastReminder': now.getTime()
            });


          } catch (emailError) {

            throw emailError;
          }
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

async function createUserData(userId, userData) {
  try {
    await set(ref(database, `users/${userId}`), userData);
    return true;
  } catch (error) {
    throw error;
  }
}

async function saveUserData(userId, userData) {
  try {
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, userData);

    return true;
  } catch (error) {

    throw error;
  }
}

async function handleSignup(name, email, university, degree, password) {
  try {

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const currentTime = Date.now();
    const userData = {
      name,
      email,
      university,
      degree,
      createdAt: currentTime,
      lastLogin: currentTime,
      assignments: {},
      quizzes: {},
      schedule: {}
    };

    await saveUserData(user.uid, userData);
    return user;
  } catch (error) {

    throw error;
  }
}

const currentPage = window.location.pathname.split('/').pop();

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createItemCard(item, type) {
  const date = new Date(item.dueDate || item.createdAt).toLocaleString();
  return `
    <div class="card item-card mb-3" data-id="${item.id}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <h5 class="card-title">${item.title}</h5>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <p class="card-text">${item.description || ''}</p>
        <div class="card-footer bg-transparent">
          <small class="text-muted">${type === 'schedule' ? 'Event Date' : 'Due Date'}: ${date}</small>
        </div>
      </div>
    </div>
  `;
}

async function deleteItem(userId, section, itemId) {
  try {
    const itemRef = ref(database, `users/${userId}/${section}/${itemId}`);
    await set(itemRef, null);

  } catch (error) {

    throw error;
  }
}

async function loadTabContent(section, userId) {
  const contentArea = document.getElementById('dynamicContent');
  contentArea.innerHTML = '<div class="loading">Loading...</div>';

  const addButton = document.getElementById('addButton');
  let calendar;

  try {
    const snapshot = await get(ref(database, `users/${userId}/${section}`));

    if (section === 'schedule') {

      contentArea.innerHTML = `
        <div id="calendar"></div>
        <div id="calendar-buttons-wrapper" class="d-flex justify-content-between align-items-center mt-3">
          <button id="calendarDeleteButton" class="btn btn-danger rounded-circle shadow-sm">
            <i class="bi bi-trash"></i>
          </button>
          <button id="calendarAddButton" class="btn btn-primary rounded-circle shadow-sm">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
      `;

      if (addButton) {
        addButton.style.display = 'none';
      }

      const events = [];
      let allEvents = [];
      const assignmentsSnapshot = await get(ref(database, `users/${userId}/assignments`));
      if (assignmentsSnapshot.exists()) {
        Object.entries(assignmentsSnapshot.val()).forEach(([id, assignment]) => {
          if (assignment.dueDate) {
            events.push({
              id: id,
              title: `Assignment: ${assignment.title}`,
              start: new Date(assignment.dueDate),
              backgroundColor: '#dc3545',
              borderColor: '#dc3545',
              description: assignment.description,
              type: 'assignments'
            });
            allEvents.push({ id, type: 'assignments', title: assignment.title });
          }
        });
      }
      const quizzesSnapshot = await get(ref(database, `users/${userId}/quizzes`));
      if (quizzesSnapshot.exists()) {
        Object.entries(quizzesSnapshot.val()).forEach(([id, quiz]) => {
          if (quiz.dueDate) {
            events.push({
              id: id,
              title: `Quiz: ${quiz.title}`,
              start: new Date(quiz.dueDate),
              backgroundColor: '#ffc107',
              borderColor: '#ffc107',
              description: quiz.description,
              type: 'quizzes'
            });
            allEvents.push({ id, type: 'quizzes', title: quiz.title });
          }
        });
      }
      if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([id, event]) => {
          if (event.startDate) {
            events.push({
              id: id,
              title: event.title,
              start: new Date(event.startDate),
              end: event.endDate ? new Date(event.endDate) : null,
              backgroundColor: '#0d6efd',
              borderColor: '#0d6efd',
              description: event.description,
              type: 'schedule'
            });
            allEvents.push({ id, type: 'schedule', title: event.title });
          }
        });
      }
      const calendarEl = document.getElementById('calendar');
      if (calendarEl) {
        calendar = new FullCalendar.Calendar(calendarEl, {
          initialView: 'dayGridMonth',
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          },
          height: 'auto',
          themeSystem: 'bootstrap5',
          events: events,
          eventDidMount: function (info) {
            if (info.event.extendedProps.description) {
              info.el.title = `${info.event.title}\n${info.event.extendedProps.description}`;
            } else {
              info.el.title = info.event.title;
            }
          },
          eventClick: function (info) {
            const event = info.event;
            if (confirm(`Do you want to delete "${event.title}"?`)) {
              deleteItem(userId, event.extendedProps.type, event.id)
                .then(() => {
                  event.remove();
                })
                .catch(error => {
                  alert('Failed to delete event. Please try again.');
                });
            }
          }
        });
        calendar.render();
        const calendarAddButton = document.getElementById('calendarAddButton');
        if (calendarAddButton) {
          calendarAddButton.addEventListener('click', () => {
            const addModal = new bootstrap.Modal(document.getElementById('addModal'));
            addModal.show();
          });
        }
        const deleteButton = document.getElementById('calendarDeleteButton');
        if (deleteButton) {
          deleteButton.addEventListener('click', () => {
            if (allEvents.length === 0) {
              alert('No events to delete.');
              return;
            }


            const modalHtml = `
              <div class="modal fade" id="deleteModal" tabindex="-1">
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Delete Events</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                      <div class="list-group">
                        ${allEvents.map(event => `
                          <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center delete-event-item" 
                            data-id="${event.id}" 
                            data-type="${event.type}">
                            ${event.title}
                            <span class="badge bg-secondary">${event.type}</span>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                  </div>
                </div>
              </div>
            `;


            const existingModal = document.getElementById('deleteModal');
            if (existingModal) {
              existingModal.remove();
            }


            document.body.insertAdjacentHTML('beforeend', modalHtml);


            const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
            document.querySelectorAll('.delete-event-item').forEach(item => {
              item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                const title = item.textContent.trim();

                if (confirm(`Are you sure you want to delete "${title}"?`)) {
                  try {
                    await deleteItem(userId, type, id);
                    const calendarEvent = calendar.getEventById(id);
                    if (calendarEvent) {
                      calendarEvent.remove();
                    }
                    item.remove();

                    allEvents = allEvents.filter(e => e.id !== id);


                    if (allEvents.length === 0) {
                      deleteModal.hide();
                    }
                  } catch (error) {
                    alert('Failed to delete event. Please try again.');
                  }
                }
              });
            });
          });
        }
      }
    } else {

      if (addButton) {
        addButton.style.display = 'block';
      }

      let content = '<div class="items-grid">';
      if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([id, item]) => {
          content += createItemCard({ ...item, id }, section);
        });
      } else {
        content += `<p class="text-center">No ${section} found. Click the + button to add one!</p>`;
      }
      content += '</div>';
      contentArea.innerHTML = content;
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          const itemId = e.target.closest('.delete-btn').getAttribute('data-id');
          if (itemId) {
            const confirmed = confirm('Are you sure you want to delete this item?');
            if (confirmed) {
              try {
                await deleteItem(userId, section, itemId);
                loadTabContent(section, userId);
              } catch (error) {
              }
            }
          }
        });
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<p class="text-center text-danger">Error loading ${section}. Please try again.</p>`;
  }
}

async function handleAddItem(userId, section, data) {
  try {
    const sectionRef = ref(database, `users/${userId}/${section}`);
    const snapshot = await get(sectionRef);

    if (snapshot.exists()) {
      const items = snapshot.val();
      const isDuplicate = Object.values(items).some(item =>
        item.title.toLowerCase() === data.title.toLowerCase() &&
        (item.dueDate === data.dueDate ||
          (item.dueDate && data.dueDate &&
            new Date(item.dueDate).getTime() === new Date(data.dueDate).getTime()))
      );
      if (isDuplicate) {
        throw new Error(`A ${section.slice(0, -1)} with this title and due date already exists.`);
      }
    }
    const itemId = generateUniqueId();
    const itemRef = ref(database, `users/${userId}/${section}/${itemId}`);

    const itemData = {
      ...data,
      createdAt: Date.now(),
      id: itemId,
      reminderSettings: {
        enabled: true,
        timeframe: 6,
        lastReminder: null
      },
      reminderSent: false
    };

    await set(itemRef, itemData);
    return itemId;
  } catch (error) {
    throw error;
  }
}
async function updateLastLoginTime(userId) {
  try {
    const currentTime = Date.now();
    await update(ref(database, `users/${userId}`), {
      lastLogin: currentTime
    });
    return currentTime;
  } catch (error) {

    throw error;
  }
}

async function updateProfileUI(user, lastLoginTime = null) {
  try {

    const snapshot = await get(ref(database, `users/${user.uid}`));
    if (snapshot.exists()) {

      const userData = snapshot.val();
      const userName = document.getElementById("userName");
      const userUniversity = document.getElementById("userUniversity");
      const welcomeName = document.getElementById("welcomeName");
      const lastLoginElement = document.getElementById("lastLogin");

      if (userName) userName.textContent = userData.name || "Student";
      if (welcomeName) welcomeName.textContent = userData.name || "Student";
      if (userUniversity) userUniversity.textContent = userData.university || "University";
      const displayTime = lastLoginTime || userData.lastLogin;
      if (lastLoginElement && displayTime) {
        lastLoginElement.textContent = `Last login: ${new Date(displayTime).toLocaleString()}`;
      }
      await loadTabContent('assignments', user.uid);
      const navLinks = document.querySelectorAll('.navlink1');
      navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          const section = link.getAttribute('data-section');
          await loadTabContent(section, user.uid);
        });
      });
      const addButton = document.getElementById('addButton');
      const addModal = new bootstrap.Modal(document.getElementById('addModal'));
      const addItemForm = document.getElementById('addItemForm');

    } else {
    }
  } catch (error) {

  }
}
onAuthStateChanged(auth, async (user) => {



  if (currentPage === 'profile.html') {
    if (!user) {

      window.location.replace('login.html');
    } else {

      try {
        const lastLoginTime = await updateLastLoginTime(user.uid);
        await updateProfileUI(user, lastLoginTime);
        checkAndSendReminders(user.uid);
        const reminderInterval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            checkAndSendReminders(user.uid);
          }
        }, 15 * 60 * 1000);
        window.addEventListener('beforeunload', () => {
          clearInterval(reminderInterval);
        });

      } catch (error) {}
  
    }
  }
});
document.addEventListener("DOMContentLoaded", () => {

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.querySelector("#fullName").value.trim();
      const email = document.querySelector("#email").value.trim();
      const university = document.querySelector("#university").value.trim();
      const degree = document.querySelector("#Degree").value.trim();
      const password = document.querySelector("#signupPassword").value.trim();

      if (!name || !email || !university || !degree || !password) {
        alert("Please fill out all the fields.");
        return;
      }
      try {
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Signing up...";
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const currentTime = Date.now();
        const userData = {
          name: name,
          email: email,
          university: university,
          degree: degree,
          createdAt: currentTime,
          lastLogin: currentTime,
          assignments: {},
          quizzes: {},
          schedule: {}
        };
        await set(ref(database, `users/${user.uid}`), userData);
        alert("Sign-up successful! Your account has been created. Please log in with your credentials.");
        signupForm.reset();
      } catch (error) {
        alert(error.message);
      } finally {
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Sign Up";
        }
      }
    });
  }
  if (window.location.pathname.includes('profile.html')) {
    const addButton = document.getElementById('addButton');
    const addModal = document.getElementById('addModal');
    const addItemForm = document.getElementById('addItemForm');
    const reminderSettings = document.getElementById('reminderSettings');

    if (addButton && addModal) {
      addButton.addEventListener('click', () => {
        const activeSection = document.querySelector('.navlink1.active').getAttribute('data-section');
        if (reminderSettings) {
          reminderSettings.style.display =
            (activeSection === 'assignments' || activeSection === 'quizzes') ? 'block' : 'none';
        }
        if (addItemForm) {
          addItemForm.reset();
        }
        const bsModal = new bootstrap.Modal(addModal);
        bsModal.show();
      });
      const saveItemBtn = document.getElementById('saveItem');
      if (saveItemBtn) {
        saveItemBtn.addEventListener('click', async () => {
          const activeSection = document.querySelector('.navlink1.active').getAttribute('data-section');
          const title = document.getElementById('itemTitle').value;
          const description = document.getElementById('itemDescription').value;
          const dueDate = document.getElementById('itemDueDate').value;
          if (!title) {
            alert('Please enter a title');
            return;
          }
          try {
            const itemData = {
              title,
              description,
              dueDate: dueDate ? new Date(dueDate).getTime() : null
            };
            if (activeSection === 'assignments' || activeSection === 'quizzes') {
              itemData.reminderSettings = {
                enabled: true,
                timeframe: 6,
                lastReminder: null
              };
              itemData.reminderSent = false;
            }
            if (activeSection === 'schedule') {
              itemData.startDate = dueDate;
              itemData.endDate = dueDate;
              itemData.type = 'other';
            }
            await handleAddItem(auth.currentUser.uid, activeSection, itemData);
            bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
            document.getElementById('addItemForm').reset();
            await loadTabContent(activeSection, auth.currentUser.uid);
            if (activeSection === 'assignments' || activeSection === 'quizzes') {
              checkAndSendReminders(auth.currentUser.uid);
            }
          } catch (error) {
            alert('Error saving item. Please try again.');
          }
        });
      }
      const user = auth.currentUser;
      if (user) {
        checkAndSendReminders(user.uid);
        const reminderInterval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            checkAndSendReminders(user.uid);
          }
        }, 15 * 60 * 1000);
        window.addEventListener('beforeunload', () => {
          clearInterval(reminderInterval);
        });
      }
    }
  };
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.querySelector("#username").value.trim();
      const password = document.querySelector("#password").value.trim();
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await updateLastLoginTime(userCredential.user.uid);
        window.location.replace('profile.html');
      } catch (error) {
        alert(error.message);
      }
    });
  }
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.replace('login.html');
      } catch (error) {

        alert(error.message);
      }
    });
  };
})

