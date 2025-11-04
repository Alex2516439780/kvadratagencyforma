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

    // Функция валидации формы
    function validateForm() {
        let isValid = true;
        let errorMessages = [];

        // Проверка всех полей формы
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const questionLabel = group.querySelector('.question-label');
            const required = questionLabel?.querySelector('.required');
            const input = group.querySelector('input, textarea');
            const checkboxGroup = group.querySelector('.checkbox-group');
            const colorPicker = group.querySelector('.color-picker');

            // Проверка текстовых полей и textarea
            if (input) {
                if (required && !input.value.trim() && !input.classList.contains('year-input')) {
                    isValid = false;
                    input.style.borderColor = '#ff4d4d';
                    errorMessages.push(questionLabel.textContent.trim());
                } else {
                    input.style.borderColor = '#fff';
                }
            }

            // Проверка checkbox-групп
            if (checkboxGroup) {
                const checkedBoxes = checkboxGroup.querySelectorAll('input[type="checkbox"]:checked');
                if (required && checkedBoxes.length === 0) {
                    isValid = false;
                    checkboxGroup.style.border = '1px solid #ff4d4d';
                    errorMessages.push(questionLabel.textContent.trim());
                } else {
                    checkboxGroup.style.border = 'none';
                }

                // Проверка поля ввода для "other-option"
                const otherOption = checkboxGroup.querySelector('.other-option:checked');
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

            // Проверка цветовой палитры
            if (colorPicker) {
                const checkedColors = colorPicker.querySelectorAll('input[type="checkbox"]:checked');
                const colorCount = checkedColors.length;

                if (required && (colorCount < 2 || colorCount > 6)) {
                    isValid = false;
                    colorPicker.style.border = '2px solid #ff4d4d';
                    errorMessages.push(questionLabel.textContent.trim());
                } else {
                    colorPicker.style.border = 'none';
                }
            }
        });

        // Показываем сообщение об ошибках
        if (!isValid) {
            const errorMessage = errorMessages.length === 1
                ? `Iltimos, to'g'ri to'ldiring: ${errorMessages[0]}`
                : `Iltimos, to'g'ri to'ldiring: ${errorMessages.join(', ')}`;
            showErrorNotification(errorMessage);
        }

        return isValid;
    }

    // Обработчик отправки формы
    document.getElementById('briefForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Показываем анимацию загрузки
        showLoadingAnimation();

        // Собираем данные из формы
        const formData = collectFormData();

        // Генерируем PDF
        let pdfDoc;
        try {
            pdfDoc = generatePDF(formData);
        } catch (error) {
            console.error('Ошибка генерации PDF:', error);
            hideLoadingAnimation();
            showErrorNotification('PDF yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
            return;
        }

        // Извлекаем имя компании из поля "brand-name"
        const brandNameInput = document.getElementById('brand-name');
        const brandName = brandNameInput.value.trim();

        // Отправляем PDF в Telegram с названием файла на основе имени компании
        try {
            await sendToTelegram(pdfDoc, brandName);
            // Лоадер будет заполняться 5 секунд, после чего покажем уведомление
            setTimeout(() => {
                hideLoadingAnimation();
                showSuccessNotification();
            }, 5000); // 5 секунд
        } catch (error) {
            console.error('Ошибка отправки в Telegram:', error);
            hideLoadingAnimation();
            showErrorNotification('Xatolik yuz berdi, iltimos qayta urinib ko\'ring.');
        }
    });

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
                { text: `Yaratilgan: ${new Date().toLocaleString('uz-UZ')}`, style: 'subheader' },
                { text: '', margin: [0, 10, 0, 10] }, // Пустая строка
                {
                    table: {
                        widths: ['50%', '50%'],
                        body: [
                            [{ text: 'Savol', style: 'tableHeader' }, { text: 'Javob', style: 'tableHeader' }],
                            ...formData.map(item => [
                                { text: item.question, style: 'questionCell' },
                                { text: item.answer, style: 'answerCell' }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10],
                    alignment: 'center'
                },
                subheader: {
                    fontSize: 10,
                    margin: [0, 0, 0, 5],
                    alignment: 'center',
                    color: '#666666'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    fillColor: '#eeeeee',
                    color: '#333333'
                },
                questionCell: {
                    fontSize: 11,
                    margin: [5, 3, 5, 3]
                },
                answerCell: {
                    fontSize: 11,
                    margin: [5, 3, 5, 3]
                }
            },
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30],
            defaultStyle: {
                font: 'Roboto'
            }
        };

        return pdfMake.createPdf(docDefinition);
    }

    // Функция для отправки в Telegram через серверный эндпоинт
    async function sendToTelegram(pdfDoc, brandName) {
        // Очищаем имя компании от недопустимых символов и добавляем суффикс .pdf
        const sanitizedBrandName = brandName
            .replace(/[^a-zA-Z0-9а-яёА-ЯЁ\s-_]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .trim();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = sanitizedBrandName ? `${sanitizedBrandName}_brief_${timestamp}.pdf` : `brief_${timestamp}.pdf`;

        const blob = await new Promise(resolve => pdfDoc.getBlob(resolve));

        const formData = new FormData();
        formData.append('document', blob, fileName);
        formData.append('filename', fileName);
        formData.append('caption', `📄 Brif: ${brandName || 'Nomsiz'} - ${new Date().toLocaleString('uz-UZ')}`);
        // Необязательно: можно прокинуть конкретные chat_ids через запятую, либо оставить дефолт на сервере
        // formData.append('chat_ids', '1142868244,521500516');

        const response = await fetch('https://kvadratagencyformaa.vercel.app/api/send-telegram', {
            method: 'POST',
            body: formData
        });

        const resultText = await response.text();
        console.log('Server Response:', resultText);

        if (!response.ok) {
            throw new Error(`Server error: ${resultText}`);
        }


        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }

        const data = await response.json();
        if (!data.ok) {
            throw new Error(data.error || 'Unknown server error');
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