
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

emailjs.init('GiiYwF-mWFul0mskY');

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);


console.log("Firebase initialized");

async function createUserData(userId, userData) {
  try {

    await set(ref(database, `users/${userId}`), userData);
    console.log("User data created successfully");
    return true;
  } catch (error) {
    console.error("Error creating user data:", error);
    throw error;
  }
}

async function saveUserData(userId, userData) {
  try {
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, userData);
    console.log("User data saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving user data:", error);
    throw error;
  }
}

async function handleSignup(name, email, university, degree, password) {
  try {

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User account created:", user.uid);


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
    console.error("Error in signup:", error);
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
    console.log(`${section} item deleted successfully`);
  } catch (error) {
    console.error(`Error deleting ${section} item:`, error);
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
                  console.error('Error deleting event:', error);
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
                    console.error('Error deleting event:', error);
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
                console.error('Failed to delete item:', error);
              }
            }
          }
        });
      });
    }
  } catch (error) {
    console.error(`Error loading ${section}:`, error);
    contentArea.innerHTML = `<p class="text-center text-danger">Error loading ${section}. Please try again.</p>`;
  }
}

async function handleAddItem(userId, section, data) {
  const itemId = generateUniqueId();
  const itemRef = ref(database, `users/${userId}/${section}/${itemId}`);

  const itemData = {
    ...data,
    createdAt: Date.now(),
    id: itemId
  };

  try {
    await set(itemRef, itemData);
    return itemId;
  } catch (error) {
    console.error(`Error adding ${section} item:`, error);
    throw error;
  }
}



async function updateLastLoginTime(userId) {
  try {
    const currentTime = Date.now();
    await update(ref(database, `users/${userId}`), {
      lastLogin: currentTime
    });
    console.log("Last login time updated successfully");
    return currentTime;
  } catch (error) {
    console.error("Error updating last login time:", error);
    throw error;
  }
}

async function updateProfileUI(user, lastLoginTime = null) {
  try {
    console.log("Fetching user data for:", user.uid);
    const snapshot = await get(ref(database, `users/${user.uid}`));

    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log("Fetched user data:", userData);


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
      const saveItemBtn = document.getElementById('saveItem');

      if (addButton && addModal && saveItemBtn) {
        addButton.addEventListener('click', () => {
          addModal.show();
        });

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

            if (activeSection === 'schedule') {
              itemData.startDate = dueDate;
              itemData.endDate = dueDate;
              itemData.type = 'other';
            }

            await handleAddItem(user.uid, activeSection, itemData);
            addModal.hide();
            addItemForm.reset();
            await loadTabContent(activeSection, user.uid);
          } catch (error) {
            alert('Error saving item. Please try again.');
          }
        });
      }
    } else {
      console.log("No user data found in database");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}


onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed. Current page:", currentPage);
  console.log("User:", user);

  if (currentPage === 'profile.html') {
    if (!user) {
      console.log("No user logged in. Redirecting to login page.");
      window.location.replace('login.html');
    } else {
      console.log("User is logged in, updating UI");
      try {

        const lastLoginTime = await updateLastLoginTime(user.uid);
        await updateProfileUI(user, lastLoginTime);
      } catch (error) {
        console.error("Error in auth state change handler:", error);
      }
    }
  }
});



document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    console.log("Found signup form");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Signup form submitted");


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

        console.log("Creating user account...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("User created:", user.uid);

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
        console.log("User data saved successfully");


        alert("Sign-up successful! Your account has been created. Please log in with your credentials.");


        signupForm.reset();
      } catch (error) {
        console.error("Error during sign-up:", error);
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
});


const loginForm = document.getElementById("loginForm");
if (loginForm) {
  console.log("Found login form");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const email = document.querySelector("#username").value.trim();
    const password = document.querySelector("#password").value.trim();

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      console.log("Attempting login...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      console.log("Login successful, updating last login time...");
      await updateLastLoginTime(userCredential.user.uid);

      console.log("Redirecting to profile...");
      window.location.replace('profile.html');
    } catch (error) {
      console.error("Error during login:", error);
      alert(error.message);
    }
  });
}


const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  console.log("Found logout button");
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace('login.html');
    } catch (error) {
      console.error("Error signing out:", error);
      alert(error.message);
    }
  });
};

