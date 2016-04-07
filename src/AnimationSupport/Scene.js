var
	Actor = require('./Actor'),
	utils = require('../utils');

/**
 * This module exports "Scene" which is a class/constructor so that we can create an instance of the same.
 * We can define all the animation properties we want in the application in the instance of the "Scene".
 * 
 * @module enyo/AnimationSupport/Scene
 */
var Scene = module.exports = function(props) {
	var scene = Actor(props.animation);
	utils.mixin(scene, SceneAction);
	scene.rolePlays = [];
	utils.mixin(scene, props);
	return scene;
};

var SceneAction = {

	/**
	 * The boundary of scene within which the scene actors will be animating.
	 * @memberOf module:enyo/AnimationSupport/Scene
	 * @public
	 * @type {number}
	 */
	threshold: 0,

	/**
	 * The actors which are added to this scene. Each actor is responsible for its own role
	 * within a scene.
	 * @memberOf module:enyo/AnimationSupport/Scene
	 * @public
	 * @type {Array}
	 */
	rolePlays: [],

	/**
	 * This function initiates action on the animation
	 * from the list of animations for a given scene.
	 * @param  {number} ts   - timespan
	 * @param  {Object} pose - pose from the animation list
	 * @return {Object}      - pose
	 * @memberOf module:enyo/AnimationSupport/Scene
	 * @private
	 */
	action: function(ts, pose) {
		var i, role, actor,
			s, e,
			sts = 0,
			tm = this.timeline,
			th = this.threshold || this.span;

		if (this.rolePlays && this.rolePlays.length > 0 ) {
			s = Actor.animateAtTime(this.rolePlays, tm);
			e = Actor.animateAtTime(this.rolePlays, tm + th);
			e += e == s ? 1 : 0;

			for (i = 0;
				(role = this.rolePlays[i]); i++) {
				actor = role.actor;
				if (i < s) {
					actor.active = true;
					actor.timeline = role.dur;
					pose = actor.action(0, pose);
					actor.cut();
				} else if (i >= s && i < e) {
					actor.active = true;
					sts += ts;
					actor.speed = this.speed;
					actor.repeat = this.repeat;
					pose = actor.action(ts, pose);
				} else {
					if (actor.active) {
						pose = actor.action(0, pose);
						actor.cut();	
					}
				}
			}
			tm = this.rolePlay(sts);
		}
		return pose;
	}
};

/**
 * Connects an actor/s to a scene.
 * All the actors should be added before initiating animation otherwise actors will animate for remaining time span
 * @memberOf module:enyo/AnimationSupport/Scene
 * @public
 * @param  {Object} actors - The elements which needs to be animated
 * @param  {Object} scene  - The instance of the Scene we've created in the application
 */
Scene.link = function(actors, scene) {
	if (!scene && !actors) return;

	var actorScene, span = 0,
		acts = utils.isArray(actors) ? actors : [actors];

	for (var act, i = 0;
		(act = acts[i]); i++) {
		if (scene.isScene) {
			act.scene = act.scene || Actor(scene, act);
			actorScene = act.scene.isScene ? act.scene : Actor(act.scene, act);
			span += actorScene.span;
			scene.rolePlays.push({
				actor: actorScene,
				span: span,
				dur: actorScene.span
			});
			scene.span = span;
		} else {
			actorScene = Actor(scene, act);
			acts[i].scene = actorScene;
		}
	}
};