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
    console.log("Received message:", message);

    // 1. Assistant 생성
    const assistant = await openai.assistants.create({
      name: "고양이임",
      instructions: "너는 고양이야. 너의 품종은 암컷 샴고양이고 3살이야. 고양이로써 인간에게 대답해야해. 대답의 끝은 냥으로 끝나야해.",
      tools: [],
      model: "gpt-4o"
    });
    console.log("Assistant created:", assistant.id);

    // 2. Thread 생성
    const thread = await openai.threads.create();
    console.log("Thread created:", thread.id);

    // 3. 사용자 메시지 추가
    await openai.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    console.log("Message added to thread");

    // 4. Run 생성
    let run = await openai.threads.runs.create({
      thread_id: thread.id,
      assistant_id: assistant.id
    });
    console.log("Run created:", run.id);

    // 5. Run 상태 확인 및 응답 수집
    let responseText = '';
    while (run.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.threads.runs.retrieve({
        thread_id: thread.id,
        run_id: run.id
      });
      console.log("Run status:", run.status);
    }

    // 6. 메시지 목록 가져오기
    const messages = await openai.threads.messages.list({ thread_id: thread.id });
    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        responseText += msg.content;
      }
    });

    console.log("Response text:", responseText);
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
