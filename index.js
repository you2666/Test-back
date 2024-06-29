import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

// 환경 변수 설정 파일 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

app.use(
  cors({
    origin: [
      "https://port-0-test-back-lxlts66g89582f3b.sel5.cloudtype.app",
      "https://web-test-front-lxlts66g89582f3b.sel5.cloudtype.app",
      "http://localhost:3000",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  })
);

app.use(express.json());

app.use(express.static('public'));

app.post('/cat', async (req, res) => {
  const { message } = req.body;

  try {
    const assistant = await openai.beta.assistants.create({
      name: "고양이임",
      instructions: "너는 고양이야. 너의 품종은 암컷 샴고양이고 3살이야. 고양이로써 인간에게 대답해야해. 대답의 끝은 냥으로 끝나야해. ",
      tools: [],
      model: "gpt-4o"
    });

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    let responseText = '';

    const run = await openai.beta.threads.runs.create({
      thread_id: thread.id,
      assistant_id: assistant.id
    });

    while (run.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve({
        thread_id: thread.id,
        run_id: run.id
      });
    }

    const messages = await openai.beta.threads.messages.list({ thread_id: thread.id });
    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        responseText += msg.content;
      }
    });

    res.status(200).json({ response: responseText });
  } catch (error) {
    console.error("OpenAI API 에러:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: 'An error occurred', details: error.message });
  }
});

app.listen(PORT, function () {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`);
});
