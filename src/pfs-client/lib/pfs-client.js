var thrift = require('thrift'),
    ImageService = require('./FaceService.js'),
    ttypes = require('./service_types.js'),
    util = require('util'),
    events = require('events');

/**
 * default configurations for Peach Image Server Client
 * @type {{host: string, port: number}}
 */
var DEFAULTS = {
    host: '127.0.0.1',
    port: 3700
};

/**
 * Create a new client
 * @param options
 * @constructor
 */
function Client(options) {
    options = options || {};
    this.options = merge(options, DEFAULTS);
}

/**
 *
 * @type {Function}
 */
exports.Client = Client;

util.inherits(Client, events.EventEmitter);


/**
 * Establish a connection. Re-emits 'connect', 'error' and 'end' events from the underlaying connection
 * @param callback - in format function(err) to receive error message
 */
Client.prototype.connect = function (callback) {
    var self = this;
    var connection = thrift.createConnection(self.options.host, self.options.port, {transport: thrift.TFramedTransport})
        .on('error',function (e) {
            self.emit('error', e);
            callback(e);
        }).on('connect',function () {
            self.emit('connect');
        }).on('end', function (e) {
            self.emit('end');
        });

    var thriftClient = thrift.createClient(ImageService, connection);

    self.connection = connection;
    self.thriftClient = thriftClient;
};

/**
 * Close the connection
 * @param callback - in format function(err) to receive error message
 */
Client.prototype.end = function (callback) {
    if (this.connection) {
        this.connection.end(callback);
    } else {
        callback(new Error('Not connected yet.'));
    }
};

/**
 * ping function, to check server health status, 0 means server is okay.
 * @param callback in format function(err, result), result is an integer
 */
Client.prototype.ping = function (callback) {
    var self = this;
    try {
        this.thriftClient.ping(callback);
    } catch (e) {
        self.emit('error', e);
        callback(e, null);
    }
};

/**
 * detectFaces function, to detect faces in the input image
 * @param imageData input image binary buffer
 * @param width requested width
 * @param height requested height
 * @param callback in format function(err, faces)
 */
Client.prototype.detectFaces = function (imageData, width, height, callback) {
    var self = this;
    try {
        var request = new ttypes.TImage({data: imageData, width: width, height: height});
        this.thriftClient.detectFaces(request, function (err, response) {
            if (err) {
                callback(err, null, null, null);
            } else if (response.error) {
                callback(response.error, null, null, null);
            } else if (response.faces) {
                callback(null, response.faces);
            } else {
                callback('Illegal State - Empty response', null, null, null);
            }
        });
    } catch (e) {
        self.emit('error', e);
        callback(e, null, null, null);
    }
};


/**
 * resize function, to resize
 * @param callback in format function(err, result), result is an integer
 */

// main export function
exports.createClient = function (options) {
    return new Client(options);
};


// Helper functions

// callback || noop borrowed from node/lib/fs.js
function noop() {
}


function merge(a, b) {
    if (a && b) {
        for (var key in b) {
            if (typeof a[key] == 'undefined') {
                a[key] = b[key];
            } else if (typeof a[key] == 'object' && typeof b[key] == 'object') {
                a[key] = merge(a[key], b[key]);
            }
        }
    }
    return a;
}