/*
 * Copyright (c) 2012 Takashi TOYOSHIMA <toyoshim@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * - Neither the name of the authors nor the names of its contributors may be
 *   used to endorse or promote products derived from this software with out
 *   specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUE
 * NTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 * DAMAGE.
 */

/**
 * Utility class to handle file system related operations.
 * @constructor
 * @param {boolean} persistent true for persistent file system, false for
 *                  temporary file system.
 * @param {number} size Requesting quota size of file system to use.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
function FsUtils(persistent, size, callback) {
  window.requestFileSystem =
      window.requestFileSystem || window.webkitRequestFileSystem;
  var type = persistent ? window.PERSISTENT : window.TEMPORARY;
  var self = this;
  this.fs = null;
  this.cwd = null;
  this.entry = null;
  this.writer = null;
  this.file = null;
  window.requestFileSystem(type, size,
      function(fs) {
        self.fs = fs;
        self.cwd = fs.root;
        callback(true);
      },
      function(e) {
        console.log(e);
        callback(false);
      });
}

/**
 * The command definitions for batch operation.
 * @type {string}
 */
FsUtils.CMD_OPEN = 'open';
FsUtils.CMD_READ = 'read';
FsUtils.CMD_WRITE = 'write';
FsUtils.CMD_TRUNCATE = 'truncate';
FsUtils.CMD_MKDIR = 'mkdir';
FsUtils.CMD_CHDIR = 'chdir';
FsUtils.CMD_FETCH = 'fetch';

/**
 * The result type definition for read operation.
 * @type {string}
 */
FsUtils.TYPE_STRING = 'string';
FsUtils.TYPE_ARRAYBUFFER = 'arraybuffer';
FsUtils.TYPE_BLOB = 'blob';

/**
 * Open or create a file with specified arguments.
 * @param {Object} args Arguments as a json object.
 *   - {string} name A filename to open.
 *   - {boolean} create Create a new file if it doesn't exist.
 *   - {boolean} exclusive Open the file with exclusive permission.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.open = function(args, callback) {
  console.log(args);
  var self = this;
  this.cwd.getFile(args.name,
      { create: args.create, exclusive: args.exclusive },
      function(entry) {
        console.log(entry);
        self.entry = entry;
        self.writer = null;
        self.file = null;
        callback(true);
      },
      function(e) {
        console.log(e);
        callback(false);
      });
};

/**
 * Read from current working file.
 * @param {Object} args Arguments as a json object.
 *   - {string} type Result type.
 *   - {Object} result Object to receive results.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.read = function(args, callback) {
  console.log(args);
  var self = this;
  var result = args.result;
  result.type = args.type;
  result.success = false;
  var doRead = function() {
    if (FsUtils.TYPE_BLOB == result.type) {
      result.data = self.file;
      result.success = true;
      callback(true);
    } else {
      var reader = new FileReader();
      reader.onload = function(e) {
        result.data = this.result;
        result.success = true;
        callback(true);
      };
      reader.onerror = function(e) {
        console.log(e);
        callback(false);
      };
      if (FsUtils.TYPE_STRING == result.type)
        reader.readAsText(self.file);
      else
        reader.readAsArrayBuffer(self.file);
    }
  };
  if (null == this.file) {
    this.entry.file(
        function(file) {
          self.file = file;
          doRead();
        },
        function(e) {
          console.log(e);
          callback(false);
        });
  } else {
    doRead();
  }
}

/**
 * Write provided data to current working file.
 * @param {Object} args Arguments as a json object.
 *   - {string|ArrayBuffer|Blob} data Data to write.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.write = function(args, callback) {
  console.log(args);
  var self = this;
  var doWrite = function() {
    self.writer.onwrite = function(e) {
      callback(true);
    };
    self.writer.onerror = function(e) {
      console.log(e);
      callback(false);
    };
    self.writer.write(new Blob([args.data]));
  };
  if (null == this.writer) {
    this.entry.createWriter(
        function(writer) {
          self.writer = writer;
          doWrite();
        },
        function(e) {
          console.log(e);
          callback(false);
        });
  } else {
    doWrite();
  }
};
 
/**
 * Make directory with specified arguments.
 * @param {Object} args Arguments as a json object.
 *   - {string} name A directory name to create.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.mkdir = function(args, callback) {
  console.log(args);
  this.cwd.getDirectory(args.name, {create: true},
      function(entry) {
        console.log(entry);
        callback(true);
      },
      function(e) {
        console.log(e);
        callback(false);
      });
};

/**
 * Truncate the current working file.
 * @param {Object} args Arguments as a json object.
 *   - {number} size The size to which the length of file is to be adjusted.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.truncate = function(args, callback) {
  console.log(args);
  var self = this;
  var doTruncate = function() {
    self.writer.onwrite = function(e) {
      callback(true);
    };
    self.writer.onerror = function(e) {
      console.log(e);
      callback(false);
    };
    self.writer.truncate(args.size);
  };
  if (null == this.writer) {
    this.entry.createWriter(
        function(writer) {
          self.writer = writer;
          doTruncate();
        },
        function(e) {
          console.log(e);
          callback(false);
        });
  } else {
    doTruncate();
  }
};

/**
 * Change current working directory.
 * @param {Object} args Arguments as a json object.
 *   - {string} name A directory name to move into.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.chdir = function(args, callback) {
  console.log(args);
  var self = this;
  this.cwd.getDirectory(args.name, { create: false },
      function(entry) {
        console.log(entry);
        self.cwd = entry;
        callback(true);
      },
      function(e) {
        console.log(e);
        callback(false);
      });
};

/**
 * Fetch URL page and copy to the specified file.
 * @param {Object} args Arguments as a json object.
 *   - {string} name A filename to store to.
 *   - {string} url A URL to download data from.
 *   - {boolean} overwrite True to overwrite even if the specified file exists.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.fetch = function(args, callback) {
  console.log(args);
  var self = this;
  var doFetch = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', args.url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      if (200 != xhr.status) {
        callback(false);
      } else {
       self.batch([
              {cmd: FsUtils.CMD_OPEN, name: args.name, create: true,
               exclusive: true },
              {cmd: FsUtils.CMD_TRUNCATE, size: 0 },
              {cmd: FsUtils.CMD_WRITE, data: xhr.response },
            ],
            function(result) {
              callback(result);
            });
      }
    };
    xhr.send();
  };
  if (!args.overwrite) {
    this.open({ name: args.name, create: false, exclusive: false },
        function(result) {
      if (result) {
        console.log('skip fetching ' + args.url + ' to ' + args.name);
        callback(true);
      } else {
        doFetch();
      }
    });
  } else {
    doFetch();
  }
};

/**
 * Do a sequence of operations.
 * @param {Array} batch An array of operation object.
 *   - {Object} operation Operations as a json object.
 *     + {string} cmd An operation name.
 *     + {boolean} force Force to continue following operations even if current
 *                 operation failed.
 *     + {function} callback A completion callback for each operation.
 *     + {...} ... Arguments related to the provided command.
 * @param {function} callback A completion callback.
 *   - {boolean} result Result
 */
FsUtils.prototype.batch = function(batch, callback) {
  var item = batch.shift();
  if (!item)
    return callback(true);
  var self = this;
  var doNext = function(result) {
    if (item.callback)
      item.callback(result);
    if (result || item.force)
      self.batch(batch, callback);
    else
      callback(false);
  }
  switch (item.cmd) {
    case FsUtils.CMD_OPEN:
      this.open(item, doNext);
      break;
    case FsUtils.CMD_READ:
      this.read(item, doNext);
      break;
    case FsUtils.CMD_WRITE:
      this.write(item, doNext);
      break;
    case FsUtils.CMD_TRUNCATE:
      this.truncate(item, doNext);
      break;
    case FsUtils.CMD_MKDIR:
      this.mkdir(item, doNext);
      break;
    case FsUtils.CMD_CHDIR:
      this.chdir(item, doNext);
      break;
    case FsUtils.CMD_FETCH:
      this.fetch(item, doNext);
      break;
   default:
      console.log('Unknown command: ' + item.cmd);
      if (item.force)
        this.batch(batch, callback);
      else
        callback(false);
  }
};

/**
 * Unit test.
 */
FsUtils.unittest = function() {
  var r1 = {};
  var r2 = {};
  var r3 = {};
  var fs = new FsUtils(false, 4 * 1024 * 1024, function(result) {
    if (!result)
      return;
    fs.batch([
        { cmd: FsUtils.CMD_OPEN, name: 'test.txt', create: true,
            exclusive: false },
        { cmd: FsUtils.CMD_WRITE, data: 'hello text' },
        { cmd: FsUtils.CMD_OPEN, name: 'test.txt', create: true,
            exclusive: false },
        { cmd: FsUtils.CMD_READ, type: FsUtils.TYPE_BLOB, result: r1 },
        { cmd: FsUtils.CMD_READ, type: FsUtils.TYPE_STRING, result: r2 },
        { cmd: FsUtils.CMD_READ, type: FsUtils.TYPE_ARRAYBUFFER, result: r3 },
        { cmd: FsUtils.CMD_MKDIR, name: 'Foo', force: true },
        { cmd: FsUtils.CMD_CHDIR, name: 'Foo' },
        { cmd: FsUtils.CMD_OPEN, name: 'foo.txt', create: true,
            exclusive: false },
        { cmd: FsUtils.CMD_WRITE, data: new ArrayBuffer(32) },
        { cmd: FsUtils.CMD_TRUNCATE, size: 16 },
        { cmd: FsUtils.CMD_CHDIR, name: '..' },
        { cmd: FsUtils.CMD_FETCH, name: 'sdcard.img', url: 'sdcard.img',
            overwrite: false },
      ],
      function(result) {
        console.log('done: ' + result);
        console.log(r1);
        console.log(r2);
        console.log(r3);
      });
  });
};

