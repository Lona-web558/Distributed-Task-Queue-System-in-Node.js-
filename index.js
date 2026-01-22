// ============================================
// DISTRIBUTED TASK QUEUE SYSTEM
// Single File - Choose mode with command line
// ============================================

var http = require('http');
var url = require('url');

// ============================================
// QUEUE SERVER CODE
// ============================================

var PORT = 3000;
var taskQueue = [];
var completedTasks = [];
var workers = [];
var taskIdCounter = 1;

function QueueServer() {
    this.server = null;
}

QueueServer.prototype.start = function() {
    var self = this;
    
    this.server = http.createServer(function(req, res) {
        var parsedUrl = url.parse(req.url, true);
        var pathname = parsedUrl.pathname;
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (pathname === '/submit-task' && req.method === 'POST') {
            self.handleSubmitTask(req, res);
        } else if (pathname === '/get-task' && req.method === 'GET') {
            self.handleGetTask(req, res);
        } else if (pathname === '/complete-task' && req.method === 'POST') {
            self.handleCompleteTask(req, res);
        } else if (pathname === '/register-worker' && req.method === 'POST') {
            self.handleRegisterWorker(req, res);
        } else if (pathname === '/status' && req.method === 'GET') {
            self.handleStatus(req, res);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });
    
    this.server.listen(PORT, function() {
        console.log('');
        console.log('╔════════════════════════════════════════════════╗');
        console.log('║   QUEUE SERVER RUNNING ON LOCALHOST:3000      ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log('');
        console.log('Server is listening at: http://localhost:3000');
        console.log('');
        console.log('Available API Endpoints:');
        console.log('  POST http://localhost:3000/submit-task');
        console.log('  GET  http://localhost:3000/get-task');
        console.log('  POST http://localhost:3000/complete-task');
        console.log('  POST http://localhost:3000/register-worker');
        console.log('  GET  http://localhost:3000/status');
        console.log('');
        console.log('Waiting for workers and clients to connect...');
        console.log('================================================');
    });
};

QueueServer.prototype.handleSubmitTask = function(req, res) {
    var body = '';
    
    req.on('data', function(chunk) {
        body += chunk.toString();
    });
    
    req.on('end', function() {
        try {
            var taskData = JSON.parse(body);
            var task = {
                id: taskIdCounter++,
                type: taskData.type || 'default',
                data: taskData.data || {},
                status: 'pending',
                createdAt: new Date().toISOString(),
                assignedTo: null
            };
            
            taskQueue.push(task);
            
            console.log('[SERVER] ✓ Task #' + task.id + ' submitted (Type: ' + task.type + ')');
            console.log('[SERVER]   Queue length: ' + taskQueue.length);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                taskId: task.id,
                message: 'Task queued successfully'
            }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
};

QueueServer.prototype.handleGetTask = function(req, res) {
    var parsedUrl = url.parse(req.url, true);
    var workerId = parsedUrl.query.workerId;
    
    if (!workerId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Worker ID required' }));
        return;
    }
    
    if (taskQueue.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ task: null }));
        return;
    }
    
    var task = taskQueue.shift();
    task.status = 'processing';
    task.assignedTo = workerId;
    task.startedAt = new Date().toISOString();
    
    console.log('[SERVER] → Task #' + task.id + ' assigned to ' + workerId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ task: task }));
};

QueueServer.prototype.handleCompleteTask = function(req, res) {
    var body = '';
    
    req.on('data', function(chunk) {
        body += chunk.toString();
    });
    
    req.on('end', function() {
        try {
            var data = JSON.parse(body);
            var taskId = data.taskId;
            var result = data.result;
            
            var completedTask = {
                id: taskId,
                result: result,
                completedAt: new Date().toISOString(),
                workerId: data.workerId
            };
            
            completedTasks.push(completedTask);
            
            console.log('[SERVER] ✓ Task #' + taskId + ' completed by ' + data.workerId);
            console.log('[SERVER]   Total completed: ' + completedTasks.length);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Task marked as complete'
            }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
};

QueueServer.prototype.handleRegisterWorker = function(req, res) {
    var body = '';
    
    req.on('data', function(chunk) {
        body += chunk.toString();
    });
    
    req.on('end', function() {
        try {
            var data = JSON.parse(body);
            var worker = {
                id: data.workerId || 'worker-' + Date.now(),
                registeredAt: new Date().toISOString(),
                capabilities: data.capabilities || []
            };
            
            workers.push(worker);
            
            console.log('[SERVER] ✓ Worker registered: ' + worker.id);
            console.log('[SERVER]   Total workers: ' + workers.length);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                workerId: worker.id
            }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
};

QueueServer.prototype.handleStatus = function(req, res) {
    var status = {
        queueLength: taskQueue.length,
        completedTasks: completedTasks.length,
        registeredWorkers: workers.length
    };
    
    console.log('[SERVER] Status check - Queue: ' + status.queueLength + ', Completed: ' + status.completedTasks + ', Workers: ' + status.registeredWorkers);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
};

// ============================================
// WORKER CODE
// ============================================

function Worker(workerId, queueServerUrl) {
    this.workerId = workerId || 'worker-' + Date.now();
    this.queueServerUrl = queueServerUrl || 'http://localhost:3000';
    this.isRunning = false;
    this.pollInterval = 2000;
}

Worker.prototype.register = function(callback) {
    var self = this;
    var postData = JSON.stringify({
        workerId: this.workerId,
        capabilities: ['math', 'string', 'data']
    });
    
    var options = url.parse(this.queueServerUrl + '/register-worker');
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    };
    
    var req = http.request(options, function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
            console.log('[' + self.workerId + '] ✓ Registered with server at localhost:3000');
            if (callback) callback();
        });
    });
    
    req.on('error', function(error) {
        console.error('[' + self.workerId + '] ✗ Registration error:', error.message);
        console.error('[' + self.workerId + '] Make sure Queue Server is running on localhost:3000');
    });
    
    req.write(postData);
    req.end();
};

Worker.prototype.start = function() {
    var self = this;
    this.isRunning = true;
    
    console.log('[' + this.workerId + '] Started polling for tasks from localhost:3000');
    console.log('[' + this.workerId + '] Checking every ' + (this.pollInterval / 1000) + ' seconds...');
    
    function poll() {
        if (!self.isRunning) return;
        
        self.fetchTask(function(task) {
            if (task) {
                self.processTask(task, function(result) {
                    self.completeTask(task.id, result, function() {
                        setTimeout(poll, 100);
                    });
                });
            } else {
                setTimeout(poll, self.pollInterval);
            }
        });
    }
    
    poll();
};

Worker.prototype.fetchTask = function(callback) {
    var self = this;
    var getUrl = this.queueServerUrl + '/get-task?workerId=' + this.workerId;
    
    http.get(getUrl, function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
            try {
                var data = JSON.parse(body);
                callback(data.task);
            } catch (error) {
                callback(null);
            }
        });
    }).on('error', function(error) {
        console.error('[' + self.workerId + '] ✗ Cannot connect to localhost:3000');
        callback(null);
    });
};

Worker.prototype.processTask = function(task, callback) {
    console.log('[' + this.workerId + '] ⚙ Processing Task #' + task.id + ' (Type: ' + task.type + ')');
    
    var result = {};
    
    if (task.type === 'math') {
        var a = task.data.a || 0;
        var b = task.data.b || 0;
        var operation = task.data.operation || 'add';
        
        if (operation === 'add') {
            result.value = a + b;
        } else if (operation === 'multiply') {
            result.value = a * b;
        } else if (operation === 'subtract') {
            result.value = a - b;
        }
        
        result.operation = operation;
        console.log('[' + this.workerId + ']   Result: ' + a + ' ' + operation + ' ' + b + ' = ' + result.value);
    } else if (task.type === 'string') {
        var text = task.data.text || '';
        result.uppercase = text.toUpperCase();
        result.length = text.length;
        result.reversed = text.split('').reverse().join('');
        console.log('[' + this.workerId + ']   Result: "' + text + '" → "' + result.uppercase + '"');
    } else {
        result.processed = true;
        result.data = task.data;
        console.log('[' + this.workerId + ']   Generic task processed');
    }
    
    setTimeout(function() {
        result.processingTime = Math.floor(Math.random() * 1000) + 500;
        callback(result);
    }, Math.floor(Math.random() * 1000) + 500);
};

Worker.prototype.completeTask = function(taskId, result, callback) {
    var self = this;
    var postData = JSON.stringify({
        taskId: taskId,
        workerId: this.workerId,
        result: result
    });
    
    var options = url.parse(this.queueServerUrl + '/complete-task');
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    };
    
    var req = http.request(options, function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
            console.log('[' + self.workerId + '] ✓ Task #' + taskId + ' completed and reported');
            if (callback) callback();
        });
    });
    
    req.on('error', function(error) {
        console.error('[' + self.workerId + '] ✗ Error reporting completion:', error.message);
        if (callback) callback();
    });
    
    req.write(postData);
    req.end();
};

// ============================================
// CLIENT CODE
// ============================================

function TaskClient(queueServerUrl) {
    this.queueServerUrl = queueServerUrl || 'http://localhost:3000';
}

TaskClient.prototype.submitTask = function(type, data, callback) {
    var postData = JSON.stringify({
        type: type,
        data: data
    });
    
    console.log('[CLIENT] Submitting ' + type + ' task to localhost:3000...');
    
    var options = url.parse(this.queueServerUrl + '/submit-task');
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    };
    
    var req = http.request(options, function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
            try {
                var response = JSON.parse(body);
                console.log('[CLIENT] ✓ Task submitted! Task ID: ' + response.taskId);
                if (callback) callback(null, response);
            } catch (error) {
                if (callback) callback(error, null);
            }
        });
    });
    
    req.on('error', function(error) {
        console.error('[CLIENT] ✗ Cannot connect to localhost:3000');
        console.error('[CLIENT] Make sure Queue Server is running!');
        if (callback) callback(error, null);
    });
    
    req.write(postData);
    req.end();
};

TaskClient.prototype.getStatus = function(callback) {
    console.log('[CLIENT] Requesting status from localhost:3000...');
    
    http.get(this.queueServerUrl + '/status', function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
            try {
                var status = JSON.parse(body);
                console.log('[CLIENT] ═══════════════════════════════');
                console.log('[CLIENT] QUEUE STATUS:');
                console.log('[CLIENT]   Pending Tasks: ' + status.queueLength);
                console.log('[CLIENT]   Completed Tasks: ' + status.completedTasks);
                console.log('[CLIENT]   Registered Workers: ' + status.registeredWorkers);
                console.log('[CLIENT] ═══════════════════════════════');
                if (callback) callback(null, status);
            } catch (error) {
                if (callback) callback(error, null);
            }
        });
    }).on('error', function(error) {
        console.error('[CLIENT] ✗ Cannot connect to localhost:3000');
        if (callback) callback(error, null);
    });
};

// ============================================
// MAIN ENTRY POINT - COMMAND LINE INTERFACE
// ============================================

var mode = process.argv[2];

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║     DISTRIBUTED TASK QUEUE SYSTEM              ║');
console.log('║     Running on localhost:3000                  ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

if (mode === 'server') {
    console.log('MODE: Queue Server');
    console.log('');
    var server = new QueueServer();
    server.start();
    
} else if (mode === 'worker') {
    var workerId = process.argv[3] || 'worker-' + Date.now();
    console.log('MODE: Worker (' + workerId + ')');
    console.log('Connecting to: http://localhost:3000');
    console.log('');
    
    var worker = new Worker(workerId);
    worker.register(function() {
        worker.start();
    });
    
} else if (mode === 'client') {
    console.log('MODE: Client (Task Submitter)');
    console.log('Connecting to: http://localhost:3000');
    console.log('');
    
    var client = new TaskClient();
    
    console.log('Submitting sample tasks...');
    console.log('');
    
    client.submitTask('math', { a: 15, b: 7, operation: 'add' });
    
    setTimeout(function() {
        client.submitTask('math', { a: 10, b: 3, operation: 'multiply' });
    }, 500);
    
    setTimeout(function() {
        client.submitTask('string', { text: 'Hello World' });
    }, 1000);
    
    setTimeout(function() {
        console.log('');
        client.getStatus();
    }, 3000);
    
} else {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║             HOW TO RUN THIS SYSTEM             ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('Save this file as: task-queue.js');
    console.log('');
    console.log('Then open 3-4 separate terminal windows:');
    console.log('');
    console.log('TERMINAL 1 (Start Queue Server):');
    console.log('  node task-queue.js server');
    console.log('');
    console.log('TERMINAL 2 (Start Worker 1):');
    console.log('  node task-queue.js worker worker-1');
    console.log('');
    console.log('TERMINAL 3 (Start Worker 2):');
    console.log('  node task-queue.js worker worker-2');
    console.log('');
    console.log('TERMINAL 4 (Submit Tasks):');
    console.log('  node task-queue.js client');
    console.log('');
    console.log('All components communicate via localhost:3000');
    console.log('================================================');
    console.log('');
}