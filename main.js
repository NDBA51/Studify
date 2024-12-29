
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

function showSignupForm() {
    document.getElementById('signupModal').style.display = 'flex';
}

function closeSignupForm() {
    document.getElementById('signupModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    
    if (!cursorDot || !cursorOutline) {

        return;
    }

    let lastX = 0;
    let lastY = 0;
    let cursorX = 0;
    let cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
    });

    function animate() {
        lastX += (cursorX - lastX) * 0.2;
        lastY += (cursorY - lastY) * 0.2;

        cursorDot.style.left = cursorX - 2.5 + 'px';
        cursorDot.style.top = cursorY - 2.5 + 'px';

        cursorOutline.style.left = lastX - 15 + 'px';
        cursorOutline.style.top = lastY - 15 + 'px';

        requestAnimationFrame(animate);
    }

    animate();
});
