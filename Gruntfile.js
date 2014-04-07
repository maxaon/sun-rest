// Generated on 2014-01-14 using generator-angular 0.7.1
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  var SRC = ['utils.js', 'sun-rest.js', 'config.js', 'schema.js', 'router.js', 'model.js', 'config.js', 'collection.js'];
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  //noinspection JSUnusedGlobalSymbols
  grunt.initConfig({

    // Project settings
    yeoman         : {
      // configurable paths
      app : 'src',
      dist: 'dist',
      src : SRC
    },
    // Bower configuration
    bwr            : grunt.file.readJSON('bower.json'),
    baseBanner     : '/*! <%= bwr.name %> v<%= bwr.version%> by maxaon*/',

    // Watches files for changes and runs tasks based on the changed files
    watch          : {
      js        : {
        files  : ['<%= yeoman.app %>/{,*/}*.js'],
        tasks  : ['newer:jshint:all'],
        options: {
          livereload: true
        }
      },
      jsTest    : {
        files: ['test/spec/{,*/}*.js'],
        tasks: ['newer:jshint:test', 'karma']
      },
      gruntfile : {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files  : [
          '<%= yeoman.app %>/{,*/}*.js',
          '.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      },
      docs      : {
        files  : 'src/**/*.js',
        tasks  : 'ngdocs',
        verbose: true
      }
    },

    // The actual grunt server settings
    connect        : {
      options   : {
        port      : 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname  : 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          base: [
            '.tmp',
            '<%= yeoman.app %>',
            'bower_components'
          ]
        }
      },
      test      : {
        options: {
          port: 9001,
          base: [
            '.tmp',
            'test',
            '<%= yeoman.app %>'
          ]
        }
      },
      dist      : {
        options: {
          base: '<%= yeoman.dist %>'
        }
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint         : {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all    : [
        'Gruntfile.js',
        '<%= yeoman.app %>/scripts/{,*/}*.js'
      ],
      test   : {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src    : ['test/spec/{,*/}*.js']
      }
    },

    // Empties folders to start fresh
    clean          : {
      options: {
        force: true
      },
      dist   : {
        files: [
          {
            src: [
              '.tmp',
              '<%= yeoman.dist %>/*',
              '!<%= yeoman.dist %>/.git*'
            ]
          }
        ]
      },
      server : '.tmp'
    },

    // Add vendor prefixed styles
    autoprefixer   : {
      options: {
        browsers: ['last 1 version']
      },
      dist   : {
        files: [
          {
            expand: true,
            cwd   : '.tmp/styles/',
            src   : '{,*/}*.css',
            dest  : '.tmp/styles/'
          }
        ]
      }
    },

    // Automatically inject Bower components into the app
    'bower-install': {
      app: {
        html      : '<%= yeoman.app %>/index.html',
        ignorePath: '<%= yeoman.app %>/'
      }
    },


    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
//    useminPrepare  : {
//      html   : '<%= yeoman.app %>/index.html',
//      options: {
//        dest: '<%= yeoman.dist %>'
//      }
//    },

    // Performs rewrites based on rev and the useminPrepare configuration
//    usemin         : {
//      html   : ['<%= yeoman.dist %>/{,*/}*.html'],
//      css    : ['<%= yeoman.dist %>/styles/{,*/}*.css'],
//      options: {
//        assetsDirs: ['<%= yeoman.dist %>']
//      }
//    },

    // Allow the use of non-minsafe AngularJS files. Automatically makes it
    // minsafe compatible so Uglify does not destroy the ng references
    ngmin          : {
      dist: {
        files: [
          {
//            expand: true,
            src : '.tmp/concatenated.js',
            dest: 'dist/sun-rest.js'
          }
        ]
      }
    },

    // Copies remaining files to places other tasks can use
    copy           : {
      dist  : {
        files: [
          {
            expand: true,
            dot   : true,
            cwd   : '<%= yeoman.app %>',
            dest  : '<%= yeoman.dist %>',
            src   : [
              '*.{ico,png,txt}',
              '.htaccess',
              '*.html',
              'views/{,*/}*.html',
              'bower_components/**/*',
              'images/{,*/}*.{webp}',
              'fonts/*'
            ]
          },
          {
            expand: true,
            cwd   : '.tmp/images',
            dest  : '<%= yeoman.dist %>/images',
            src   : ['generated/*']
          }
        ]
      },
      styles: {
        expand: true,
        cwd   : '<%= yeoman.app %>/styles',
        dest  : '.tmp/styles/',
        src   : '{,*/}*.css'
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent     : {
      server: [
        'copy:styles'
      ],
      test  : [
        'copy:styles'
      ],
      dist  : [
        'copy:styles'
//        'imagemin',
//        'svgmin'
      ]
    },

    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css',
    //         '<%= yeoman.app %>/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    uglify         : {
      options: {
        sourceMap: '<%= yeoman.dist %>/sun-rest.min.js.map',
        banner   : '<%= baseBanner %>'
      },
      dist   : {

        files: {
          '<%= yeoman.dist %>/sun-rest.min.js': [
            '<%= yeoman.dist %>/sun-rest.js'
          ]
        }
      }
    },
    concat         : {
      options: {
        stripBanners: true,
//        process     : function (src) {
//          return src.replace(/[\s\S]*\(function \(\S*\) {\s*['"]use strict['"]\;*([\s\S]*)}\(angular\)\)\;/, '$1')
//            .replace(/\s*var\smodule/, '  module');
//        },
        banner      : [
          '<%= baseBanner %>' ,
          '(function (angular) {' ,
          '  \'use strict\';'

        ].join('\n'),
        footer      : '}(angular));'
      },
      dist   : {
        src : (function () {
          var cwd = 'src/';
          var arr = SRC;
          // determine file order here and concat to arr
          return arr.map(function (file) {
            return cwd + file;
          });
        }()),
        dest: '.tmp/concatenated.js'
      }
    },
    jsbeautifier   : {
      options: {
        js: {
          indentSize : 2,
          jslintHappy: true
        }
      },
      dist   : {
        src: 'dist/sun-rest.js'
      }
    },
    // Test settings
    karma          : {
      unit     : {
        configFile: 'karma.conf.js',
        singleRun : true
      },
      minimized: {
        configFile: 'karma-minimized.conf.js',
        singleRun : true
      }
    },

    // Documentation generator
    ngdocs         : {
      options: {
        dest     : 'docs',
        html5Mode: false,
        scripts  : ['angular.js']
      },
      all    : ['src/**/*.js']
    }
  });


  grunt.registerTask('serve', function (target) {
    if (target === 'dist') {
      grunt.task.run(['build', 'connect:dist:keepalive']);
      return;
    }

    grunt.task.run([
      'clean:server',
      'bower-install',
      'concurrent:server',
      'autoprefixer',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('server', function () {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve']);
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
    'autoprefixer',
    'connect:test',
    'karma:unit'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'concat:dist',
    'ngmin',
    'jsbeautifier:dist',
    'uglify',
    'clean:server',
    'karma:minimized',
    'ngdocs'
  ]);

  grunt.registerTask('default', ['build']);
};

