// stats.js - helper exposing calculateStatistics for reuse
// Defines canonical question texts and option lists to ensure consistent aggregation and ordering.
const QUESTIONS_META = [
  { key: 'q1', text: 'Как часто вы пользуетесь ИИ?', options: ['Несколько раз в день','Каждый день','Несколько раз в неделю','Несколько раз в месяц','Редко','Не пользуюсь'] },
  { key: 'q2', text: 'Для чего вы чаще всего используете ИИ?', options: ['Поиск информации','Работа','Учёба','Создание текстов','Решение повседневных задач','Развлечение','Общение'] },
  { key: 'q3', text: 'Насколько важную роль ИИ играет в вашей повседневной жизни?', options: ['Практически никакую','Небольшую','Умеренную','Значительную','Очень значительную'] },
  { key: 'q4', text: 'Как вы обычно относитесь к ответам ИИ?', options: ['Обычно доверяю','Скорее доверяю','Доверяю, но проверяю','Скорее не доверяю','Не доверяю'] },
  { key: 'q5', text: 'Как часто вы проверяете информацию, полученную от искусственного интеллекта?', options: ['Всегда','Часто (в большинстве случаев)','Иногда','Редко','Никогда'] },
  { key: 'q6', text: 'Случается ли вам обращаться к ИИ не только за информацией, но и за мнением или советом?', options: ['Часто','Иногда','Редко','Никогда'] },
  { key: 'q7', text: 'Насколько вам комфортно обсуждать с ИИ личные или эмоциональные темы?', options: ['Очень комфортно','Скорее комфортно','Нейтрально','Скорее некомфортно','Совсем некомфортно','Я не обсуждаю с ИИ личные темы'] },
  { key: 'q8', text: 'Как вы оцениваете способность искусственного интеллекта понимать эмоции и переживания человека?', options: ['Хорошо понимает и учитывает эмоции','Иногда понимает, но часто ошибается','Плохо понимает эмоции','Совсем не способен понимать эмоции','Затрудняюсь ответить'] },
  { key: 'q9', text: 'Что для вас важнее всего в общении с ИИ?', options: ['Получить точный ответ','Быстро решить задачу','Получить понятное объяснение','Получить поддержку','Возможность свободно высказать свои мысли'] },
  { key: 'q10', text: 'Считаете ли вы, что в будущем искусственный интеллект сможет оказывать эмоциональную поддержку людям на уровне, сопоставимом с человеком?', options: ['Да, сможет','Скорее сможет','Скорее не сможет','Нет, не сможет','Затрудняюсь ответить'] }
];

function calculateStatistics(responses){
  const total = responses.length;
  const questions = [];
  // initialize counts from meta to include zeroes
  QUESTIONS_META.forEach(meta => {
    const counts = new Map(meta.options.map(opt => [opt, 0]));
    responses.forEach(r => {
      const v = r.answers && r.answers[meta.key];
      if(Array.isArray(v)){
        v.forEach(item => {
          if(counts.has(item)) counts.set(item, counts.get(item)+1);
          else counts.set(item, (counts.get(item)||0)+1);
        });
      }else if(v !== undefined && v !== null){
        if(counts.has(v)) counts.set(v, counts.get(v)+1);
        else counts.set(v, (counts.get(v)||0)+1);
      }
    });
    const options = Array.from(counts.entries()).map(([text,count])=>({text,count,percent: total? (count/total)*100:0}));
    questions.push({ key: meta.key, text: meta.text, options });
  });
  return { total, questions };
}

module.exports = { calculateStatistics };
