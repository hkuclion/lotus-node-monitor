import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Sector from "../views/Sector";
import Job from "../views/Job";

Vue.use(VueRouter)

const routes = [
	{
		path:'/',
		name:'Home',
		component:Home,
		children:[
			{
				path:'sectors',
				name:'Sector',
				component:Sector,
			},
			{
				path:'jobs',
				name:'Job',
				component:Job,
			}
		]
	},
]

const router = new VueRouter({
	routes
})

export default router
