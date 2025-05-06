document.addEventListener('DOMContentLoaded', () => {
    // Обработка всех checkbox-групп (включая цветовые)
    document.querySelectorAll('.checkbox-group').forEach(group => {
        const selectionType = group.dataset.selection;
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (!selectionType) return;

                const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);

                if (selectionType === 'single' && checkedBoxes.length > 1) {
                    checkedBoxes.forEach(cb => {
                        if (cb !== checkbox) cb.checked = false;
                    });
                } else if (selectionType === 'double' && checkedBoxes.length > 2) {
                    checkedBoxes.forEach(cb => {
                        if (cb !== checkbox && cb !== checkedBoxes[checkedBoxes.length - 2]) {
                            cb.checked = false;
                        }
                    });
                } else if (selectionType === 'triple' && checkedBoxes.length > 3) {
                    checkedBoxes.forEach(cb => {
                        if (cb !== checkbox && cb !== checkedBoxes[checkedBoxes.length - 2] && cb !== checkedBoxes[checkedBoxes.length - 3]) {
                            cb.checked = false;
                        }
                    });
                }
            });
        });
    });

    // Обработка "Boshqa javob" вариантов
    document.querySelectorAll('.other-option').forEach(other => {
        const otherInput = other.parentElement.nextElementSibling;
        other.addEventListener('change', () => {
            otherInput.style.display = other.checked ? 'block' : 'none';
        });
    });

    // Обработка отправки формы
    const form = document.getElementById('briefForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Проверка обязательных полей
        if (!validateForm()) {
            showErrorNotification('Iltimos, barcha majburiy savollarni to\'ldiring! 3.1 uchun kamida 2 ta rang tanlang.');
            return;
        }

        // Показываем анимацию загрузки
        showLoadingAnimation();

        // Собираем данные из формы
        const formData = collectFormData();

        // Генерируем PDF
        const pdfDoc = generatePDF(formData);

        // Извлекаем имя компании из поля "brand-name"
        const brandNameInput = document.getElementById('brand-name');
        const brandName = brandNameInput.value.trim();

        // Отправляем PDF в Telegram с названием файла на основе имени компании
        sendToTelegram(pdfDoc, brandName).catch(error => {
            console.error('Ошибка отправки в Telegram:', error);
            showErrorNotification('Xatolik yuz berdi, iltimos qayta urinib ko\'ring.');
        });

        // Лоадер будет заполняться 5 секунд, после чего покажем уведомление
        setTimeout(() => {
            hideLoadingAnimation();
            showSuccessNotification();
        }, 5000); // 5 секунд
    });

    // Функция валидации формы
    function validateForm() {
        let isValid = true;

        // Проверка текстовых полей и textarea с атрибутом required
        const requiredInputs = document.querySelectorAll('input[required], textarea[required]');
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ff4d4d';
            } else {
                input.style.borderColor = '#fff';
            }
        });

        // Проверка обязательных checkbox-групп и color-picker
        const requiredGroups = document.querySelectorAll('.form-group .question-label .required');
        requiredGroups.forEach(required => {
            const group = required.closest('.form-group').querySelector('.checkbox-group, .color-picker');
            if (group) {
                const checkedBoxes = group.querySelectorAll('input[type="checkbox"]:checked');
                
                // Проверка для цветовой палитры (вопрос 3.1)
                if (group.classList.contains('color-picker')) {
                    if (checkedBoxes.length < 2) {
                        isValid = false;
                        group.style.border = '2px solid #ff4d4d';
                        // Прокручиваем к цветовой палитре
                        group.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        group.style.border = 'none';
                    }
                } 
                // Проверка для обычных checkbox-групп
                else if (group.classList.contains('checkbox-group')) {
                    if (checkedBoxes.length === 0) {
                        isValid = false;
                        group.style.border = '1px solid #ff4d4d';
                    } else {
                        group.style.border = 'none';
                    }
                }

                // Проверка поля ввода для "other-option" в обязательных группах
                const otherOption = group.querySelector('.other-option:checked');
                if (otherOption) {
                    const otherInput = otherOption.parentElement.nextElementSibling;
                    if (otherInput && !otherInput.value.trim()) {
                        isValid = false;
                        otherInput.style.borderColor = '#ff4d4d';
                    } else if (otherInput) {
                        otherInput.style.borderColor = '#fff';
                    }
                }
            }
        });

        return isValid;
    }

    // Функция для сбора данных из формы
    function collectFormData() {
        const formData = [];
        const sections = document.querySelectorAll('.section-block');

        sections.forEach(section => {
            const groups = section.querySelectorAll('.form-group');
            groups.forEach(group => {
                let questionText = '';
                const questionLabel = group.querySelector('.question-label');
                const label = group.querySelector('label');
                if (questionLabel) {
                    questionText = questionLabel.textContent.trim();
                } else if (label) {
                    questionText = label.textContent.trim().replace(/ \*$/, '');
                }

                let answer = '';
                const textInput = group.querySelector('input[type="text"], input[type="tel"], textarea');
                if (textInput && textInput.value.trim()) {
                    answer = textInput.value.trim();
                }

                const checkedBoxes = group.querySelectorAll('input[type="checkbox"]:checked');
                if (checkedBoxes.length > 0) {
                    const checkboxAnswers = Array.from(checkedBoxes).map(cb => {
                        const otherInput = cb.parentElement.nextElementSibling;
                        if (cb.classList.contains('other-option') && otherInput?.value.trim()) {
                            return otherInput.value.trim();
                        } else if (cb.value === 'Shiorni yozish' && otherInput?.value.trim()) {
                            return `Shior: ${otherInput.value.trim()}`;
                        }
                        return cb.value; // Для цветов это HEX-код
                    });
                    answer = checkboxAnswers.join(', ');
                }

                if (questionText && answer) {
                    formData.push({ question: questionText, answer });
                }
            });
        });

        return formData;
    }

    // Функция для генерации PDF
    function generatePDF(formData) {
        const docDefinition = {
            content: [
                { text: 'Logotip yaratish bo\'yicha brif', style: 'header' },
                {
                    table: {
                        widths: ['50%', '50%'],
                        body: [
                            [{ text: 'Savol', style: 'tableHeader' }, { text: 'Javob', style: 'tableHeader' }],
                            ...formData.map(item => [item.question, item.answer])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
                tableHeader: { bold: true, fontSize: 11, fillColor: '#eeeeee' }
            },
            pageSize: 'A4',
            pageMargins: [20, 20, 20, 20]
        };

        return pdfMake.createPdf(docDefinition);
    }

    // Функция для отправки в Telegram
    async function sendToTelegram(pdfDoc, brandName) {
        const botToken = '8164159617:AAGHUubSJbyxsOzIBbfcNOrQE5CsNnYD11o';
        const chatId = '1142868244';
        const url = `https://api.telegram.org/bot${botToken}/sendDocument`;

        // Очищаем имя компании от недопустимых символов и добавляем суффикс .pdf
        const sanitizedBrandName = brandName
            .replace(/[^a-zA-Z0-9-_]/g, '_') // Заменяем недопустимые символы на подчеркивание
            .replace(/_+/g, '_') // Убираем множественные подчеркивания
            .trim(); // Убираем пробелы в начале и конце
        const fileName = sanitizedBrandName ? `${sanitizedBrandName}_brief.pdf` : 'brief.pdf'; // Если имя пустое, используем значение по умолчанию

        const blob = await new Promise(resolve => pdfDoc.getBlob(resolve));
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', blob, fileName);

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка отправки в Telegram');
        }
    }

    // Функция для показа анимации загрузки
    function showLoadingAnimation() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 1000;
        `;

        const glass = document.createElement('div');
        glass.id = 'loading-glass';
        glass.style.cssText = `
            width: 120px; height: 120px; border: 5px solid #fff;
            position: relative; overflow: hidden; background: transparent;
            animation: pulse 1.5s infinite ease-in-out;
        `;

        const fill = document.createElement('div');
        fill.id = 'loading-fill';
        fill.style.cssText = `
            position: absolute; bottom: 0; left: 0; width: 100%; height: 0;
            background: #fff; box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            transition: height 5s linear; /* Плавное заполнение за 5 секунд */
        `;
        glass.appendChild(fill);

        const percent = document.createElement('div');
        percent.id = 'loading-percent';
        percent.textContent = '0%';
        percent.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: #000; font-size: 28px; font-family: 'Montserrat', sans-serif;
            font-weight: bold; z-index: 1;
        `;
        glass.appendChild(percent);

        const text = document.createElement('div');
        text.id = 'loading-text';
        text.textContent = 'Yuborilmoqda...';
        text.style.cssText = `
            color: white; font-size: 24px; font-family: 'Montserrat', sans-serif;
            margin-top: 20px;
        `;

        overlay.appendChild(glass);
        overlay.appendChild(text);
        document.body.appendChild(overlay);

        // Запускаем анимацию заполнения до 100% за 10 секунд
        setTimeout(() => {
            fill.style.height = '100%';
            percent.textContent = '100%';
        }, 0);

        // Обновляем процент каждые 50 мс
        let progress = 0;
        const interval = setInterval(() => {
            if (progress < 100) {
                progress += 2; // Увеличиваем на 2% за раз для ускорения анимации
                percent.textContent = `${progress}%`;
            }
        }, 50); // 50 мс * 50 шагов = 5 секунд

        overlay.dataset.interval = interval;
    }

    // Функция для скрытия анимации
    function hideLoadingAnimation() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            clearInterval(overlay.dataset.interval);
            setTimeout(() => overlay.remove(), 500);
        }
    }

    // Функция для показа уведомления об успехе
    function showSuccessNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 25px;
            background: #4CAF50; color: white; border-radius: 5px;
            font-family: 'Montserrat', sans-serif; z-index: 1000;
        `;
        notification.textContent = 'Muvaffaqiyatli yuborildi!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    // Функция для показа уведомления об ошибке
    function showErrorNotification(message) {
        const existingNotification = document.querySelector('.error-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 25px;
            background: #ff4d4d; color: white; border-radius: 5px;
            font-family: 'Montserrat', sans-serif; z-index: 1000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
});

// Добавляем ключевые кадры для пульсации
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(styleSheet);