// Enhanced FAQ Data
const faqData = [
    {
        question: "How do I log in to the Student Portal?",
        answer: "To log in to the Student Portal, click on the Login button on the homepage. Enter your student ID and password. If you don't have a password, click on the Forgot Password link to reset it. If you're still having trouble, contact our support team for assistance."},
    {
        question: "How can I update my personal information (address, phone number, etc.)?",
        answer: "To update your personal information, log in to your student portal account and go to the Profile section. Click on Edit Profile to make changes to your address, phone number, email, or any other details. Be sure to save your changes after editing."
    },
    {
        question: "Is Studify available on mobile devices?",
        answer: "Yes! Studify is fully responsive and works seamlessly on all devices. You can access your study materials and manage your academic life from your smartphone, tablet, or computer."
    },
    {
        question: "How do I view my grades and academic progress?",
        answer: "After logging in to the Student Portal, go to the Grades or Academic Records section. Here, you can view your current grades, past courses, and academic progress. You may also download transcripts if needed."
    },
    {
        question: "How do I reset my password if I have forgotten it?",
        answer: " If you have forgotten your password, go to the login page and click on the Forgot Password? link. You will be asked to enter your student ID or registered email address. An email with a link to reset your password will be sent to you. Follow the instructions to set a new password."
    }
];

// Initialize FAQ Accordion with Animation
document.addEventListener('DOMContentLoaded', function() {
    const accordion = document.getElementById('faqAccordion');
    
    faqData.forEach((faq, index) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        
        accordionItem.innerHTML = `
            <h2 class="accordion-header">
                <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                    ${faq.question}
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                    ${faq.answer}
                </div>
            </div>
        `;
        
        accordion.appendChild(accordionItem);
    });
});

