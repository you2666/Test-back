import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

// 환경 변수 설정 파일 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // 포트 설정

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // OpenAI API 키 설정

// CORS 설정
app.use(
  cors({
    origin: [
      "https://port-0-test-back-lxlts66g89582f3b.sel5.cloudtype.app",
      "https://web-test-front-lxlts66g89582f3b.sel5.cloudtype.app",
      "http://localhost:3000",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // 허용할 HTTP 메소드
    preflightContinue: false,
    optionsSuccessStatus: 204, // 프리플라이트 요청에 대한 상태 코드
    credentials: true, // 자격 증명 허용
  })
);

app.use(express.json()); // JSON 형식의 요청 본문을 파싱

// 대화 요청을 처리하는 엔드포인트
app.post('/negative', async (req, res) => {
  const { message } = req.body; // 클라이언트로부터 전달받은 메시지

  try {
    const assistant = await openai.beta.assistants.create({
      name: "고양이임", // 어시스턴트 이름
      instructions: "너는 고양이야. 너의 품종은 암컷 샴고양이고 3살이야. 고양이로써 인간에게 대답해야해. 대답의 끝은 냥으로 끝나야해. ", // 어시스턴트 사용 설명
      tools: [], // 도구 설정 (현재 비어 있음)
      model: "gpt-4o" // 사용할 모델
    });

    const thread = await openai.beta.threads.create(); // 스레드 생성

    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: message // 클라이언트로부터 전달받은 메시지
      }
    );

    let responseText = ''; // 응답 텍스트를 저장할 변수

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    const messages = await openai.beta.threads.messages.list(thread.id);
    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        responseText += msg.content; // 어시스턴트의 응답 텍스트를 추가
      }
    });

    res.status(200).json({ response: responseText }); // 응답이 끝나면 클라이언트에게 응답 텍스트 전송
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred'); // 오류 발생 시 500 상태 코드 전송
  }
});

// 서버 시작
app.listen(PORT, function () {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`); // 서버 실행 알림 메시지
});
