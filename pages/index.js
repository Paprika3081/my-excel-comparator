import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [matches, setMatches] = useState([]);
  const [notFound, setNotFound] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState({ file1: null, file2: null });
  const [message, setMessage] = useState('');

  const handleFile1Change = (e) => {
    const file = e.target.files[0];
    setFile1(file);
    setMessage('Загружаем файл из 1С...');
    processFile(file, 1);
  };

  const handleFile2Change = (e) => {
    const file = e.target.files[0];
    setFile2(file);
    setMessage('Загружаем файл из дисконтной карты...');
    processFile(file, 2);
  };

  const processFile = (file, type) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      console.log("Processed JSON:", json); // Проверка содержимого JSON

      if (type === 1) {
        // Для первого файла (1С) выбираем второй столбец (ФИО сотрудников)
        const columnIndex1 = 1;  // Столбец 2 для 1С
        const data1 = json
          .filter((row) => row[columnIndex1]) // Фильтруем пустые строки
          .map((row) => row[columnIndex1].trim().toLowerCase()); // Извлекаем только второй столбец и приводим к нижнему регистру
        console.log("File 1 processed data:", data1); // Проверка данных из 1С
        setProcessedData((prevData) => ({ ...prevData, file1: data1 }));
        setMessage('Файл из 1С загружен. Ожидаем второй файл...');
      }

      if (type === 2) {
        // Для второго файла (Дисконтная карта) извлекаем Фамилия, Имя и Отчество по индексам
        const data2 = json.map((row) => {
          const lastName = row[5] || '';  // Столбец F — Фамилия
          const firstName = row[6] || '';  // Столбец G — Имя
          const middleName = row[7] || '';  // Столбец H — Отчество
          
          // Возвращаем массив с тремя столбцами: Фамилия, Имя, Отчество
          if (firstName && lastName) {
            return {
              fullName: `${lastName.trim()} ${firstName.trim()} ${middleName.trim()}`.toLowerCase()
            };
          }
          return null;  // Если имя или фамилия пустые, игнорируем эту строку
        }).filter(item => item !== null);  // Убираем пустые строки
        console.log("File 2 processed data:", data2); // Проверка данных из дисконтной карты
        setProcessedData((prevData) => ({ ...prevData, file2: data2 }));
        setMessage('Файл из дисконтной карты загружен. Готовы к сравнению...');
      }
    };
    reader.readAsBinaryString(file);
  };

  const normalize = (str) => {
    if (typeof str === 'string') {
      return str.trim().toLowerCase();
    }
    return ''; // Если значение не строка, возвращаем пустую строку
  };

  const handleCompare = () => {
    if (!file1 || !file2) {
      alert('Пожалуйста, выберите оба файла');
      return;
    }

    setIsProcessing(true); // Включаем процесс загрузки

    const { file1: data1, file2: data2 } = processedData;

    console.log("Comparing data1:", data1); // Проверка данных для сравнения
    console.log("Comparing data2:", data2); // Проверка данных для сравнения

    // Ищем совпадения с учётом нормализации строк
    const matchedRows = data1.filter((row1) =>
      data2.some((row2) => normalize(row1) === normalize(row2.fullName))
    );
    console.log("Matched rows:", matchedRows); // Проверка совпадений

    setMatches(matchedRows);

    // Ищем пользователей, которых нет во втором файле
    const notFoundUsers = data1.filter((row1) =>
      !data2.some((row2) => normalize(row1) === normalize(row2.fullName))
    );
    console.log("Not found users:", notFoundUsers); // Проверка отсутствующих пользователей
    setNotFound(notFoundUsers);

    setIsProcessing(false); // Останавливаем процесс загрузки
    setMessage('Сравнение завершено. Показать результаты!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">Сравнение сотрудников между двумя таблицами</h1>

      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-700 mb-2">Загрузите файл из 1С (сотрудники)</label>
        <input 
          type="file" 
          accept=".xls, .xlsx" 
          onChange={handleFile1Change} 
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-md p-2" 
        />
      </div>

      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-700 mb-2">Загрузите файл из дисконтной карты (клиенты)</label>
        <input 
          type="file" 
          accept=".xls, .xlsx" 
          onChange={handleFile2Change} 
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-md p-2" 
        />
      </div>

      {processedData.file1 && processedData.file2 && (
        <div className="mb-6">
          <button 
            onClick={handleCompare} 
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
          >
            Сравнить
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="mt-4 text-center text-lg text-gray-700">Пожалуйста, подождите, данные обрабатываются...</div>
      )}

      {/* Отображаем сообщение о текущем процессе */}
      <div className="mt-4 text-center text-lg text-gray-700">{message}</div>

      {/* Результаты сравнения */}
      {matches.length > 0 || notFound.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Результаты сравнения:</h2>
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Совпадения</th>
                <th className="border border-gray-300 px-4 py-2">Нет совпадений</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{match}</td>
                  <td className="border border-gray-300 px-4 py-2">{notFound[index] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
