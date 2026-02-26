const request = require('supertest');
const { createApp } = require('./index');

describe('Synapse Agent', () => {
    let mockDrive;
    let mockVertexAI;
    let mockGenerativeModel;
    let mockChat;

    beforeEach(() => {
        // Mock Drive Client
        mockDrive = {
            files: {
                get: jest.fn(),
                update: jest.fn()
            }
        };

        // Mock Vertex AI Client
        mockChat = {
            sendMessage: jest.fn(),
            getHistory: jest.fn()
        };
        mockGenerativeModel = {
            startChat: jest.fn().mockReturnValue(mockChat)
        };
        mockVertexAI = {
            getGenerativeModel: jest.fn().mockReturnValue(mockGenerativeModel)
        };
    });

    test('POST / should return 400 if prompt is missing', async () => {
        const app = createApp(mockDrive, mockVertexAI);
        const response = await request(app)
            .post('/')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Prompt is required in the request body.');
    });

    test('POST / should process valid prompt and return 200', async () => {
        const prompt = 'Test prompt';
        const expectedResponse = 'Test response';
        const mockHistory = [{ role: 'user', parts: [{ text: 'prev' }] }];
        const newHistory = [...mockHistory, { role: 'user', parts: [{ text: prompt }] }];

        // Setup Mocks
        mockDrive.files.get.mockResolvedValue({
            data: { history: mockHistory }
        });

        mockChat.sendMessage.mockResolvedValue({
            response: {
                candidates: [{ content: { parts: [{ text: expectedResponse }] } }]
            }
        });
        mockChat.getHistory.mockResolvedValue(newHistory);

        mockDrive.files.update.mockResolvedValue({});

        const app = createApp(mockDrive, mockVertexAI);
        const response = await request(app)
            .post('/')
            .send({ prompt });

        expect(response.status).toBe(200);
        expect(response.body.response).toBe(expectedResponse);

        // Verify Interactions
        expect(mockDrive.files.get).toHaveBeenCalled();

        // Verify System Instruction for Repeat
        expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
            systemInstruction: expect.stringContaining("If the command is 'repeat' alone, repeat the entire active process.")
        }));

        expect(mockGenerativeModel.startChat).toHaveBeenCalledWith({ history: mockHistory });
        expect(mockChat.sendMessage).toHaveBeenCalledWith(prompt);
        expect(mockChat.getHistory).toHaveBeenCalled();
        expect(mockDrive.files.update).toHaveBeenCalled();
    });

    test('POST / should return 500 on internal error', async () => {
        const prompt = 'Test prompt';

        // Simulate Drive Error
        mockDrive.files.get.mockRejectedValue(new Error('Drive error'));

        const app = createApp(mockDrive, mockVertexAI);
        const response = await request(app)
            .post('/')
            .send({ prompt });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('An internal error occurred.');
    });
});
